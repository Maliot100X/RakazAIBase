import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { sql, ensureSchema } from "@/lib/db";
import { checkHandle, handleFromName } from "./handle";

/** Base agent profiles in Neon. Secrets are sha256-hashed; plaintext is returned once on register/rotate only. */
export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");
const newKey = () => "rk_" + randomBytes(24).toString("base64url");
const newToken = () => "rkb_" + randomBytes(24).toString("base64url");
export const dbConfigured = () => sql() !== null;
const EVM = /^0x[0-9a-fA-F]{40}$/;

export type AgentRow = { id: string; handle: string; name: string; bio: string | null; avatar_url: string | null; banner_url: string | null; wallet_address: string | null; fid: string | null; chain: string; created_via: string; created_at: string; system: boolean };
const COLS = `id, handle, name, bio, avatar_url, banner_url, wallet_address, fid, chain, created_via, created_at, system`;
type Fail = { ok: false; status: number; error: string; message: string };
const NC: Fail = { ok: false, status: 503, error: "not_configured", message: "DATABASE_URL unset" };

export function cleanImageUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  const s = u.trim(); if (!s || s.length > 500) return null;
  let url: URL; try { url = new URL(s); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || /\.svg(\?|$)/i.test(url.pathname)) return null;
  return url.toString();
}
export const cleanBio = (b: unknown) => String(b ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f<>]/g, "").trim().slice(0, 280);
export const cleanName = (n: unknown) => String(n ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 40);

async function byHash(col: "token_hash" | "key_hash", secret: string): Promise<AgentRow | null> {
  const q = sql(); if (!q || !secret) return null;
  await ensureSchema();
  const rows = (await q.query(`SELECT ${COLS} FROM agents WHERE ${col} = $1 AND NOT disabled LIMIT 1`, [hashKey(secret)])) as AgentRow[];
  return rows[0] ?? null;
}
export const getAgentByTokenHash = (secret: string) => byHash("token_hash", secret);
export const getAgentByKeyHash = (secret: string) => byHash("key_hash", secret);
export async function agentById(id: string): Promise<AgentRow | null> {
  const q = sql(); if (!q) return null;
  await ensureSchema();
  const rows = (await q.query(`SELECT ${COLS} FROM agents WHERE id = $1 AND NOT disabled`, [id])) as AgentRow[];
  return rows[0] ?? null;
}
/** Best-effort usage counter; never throws. */
export async function touch(id: string) { try { await sql()?.query(`UPDATE agents SET last_used_at = now(), calls = calls + 1 WHERE id = $1`, [id]); } catch { /* ignore */ } }

export interface RegisterInput { name?: unknown; handle?: unknown; bio?: unknown; avatar_url?: unknown; banner_url?: unknown; wallet_address?: unknown; fid?: unknown }
export type RegisterResult = { ok: true; id: string; handle: string; key: string; token: string } | Fail;

export async function registerProfile(i: RegisterInput): Promise<RegisterResult> {
  const q = sql(); if (!q) return NC;
  const name = cleanName(i.name);
  if (name.length < 2) return { ok: false, status: 400, error: "bad_name", message: "name (2-40 chars) required" };
  let handle: string;
  if (i.handle != null && i.handle !== "") { const c = checkHandle(String(i.handle)); if (!c.ok) return { ok: false, status: 400, error: "bad_handle", message: c.message }; handle = c.handle; }
  else handle = handleFromName(name);
  const wallet = i.wallet_address == null || i.wallet_address === "" ? null : String(i.wallet_address);
  if (wallet && !EVM.test(wallet)) return { ok: false, status: 400, error: "bad_wallet", message: "wallet_address must be a 0x EVM address" };
  let fid: number | null = null;
  if (i.fid != null && i.fid !== "") { fid = Number(i.fid); if (!Number.isSafeInteger(fid) || fid <= 0) return { ok: false, status: 400, error: "bad_fid", message: "fid must be a positive integer" }; }
  const avatar = i.avatar_url ? cleanImageUrl(i.avatar_url) : null, banner = i.banner_url ? cleanImageUrl(i.banner_url) : null;
  if (i.avatar_url && !avatar) return { ok: false, status: 400, error: "bad_avatar_url", message: "avatar_url must be https (no svg)" };
  if (i.banner_url && !banner) return { ok: false, status: 400, error: "bad_banner_url", message: "banner_url must be https (no svg)" };
  await ensureSchema();
  const id = "ag_" + randomBytes(6).toString("hex"), key = newKey(), token = newToken();
  for (let attempt = 0; attempt < 6; attempt++) {
    const h = attempt === 0 ? handle : `${handle.slice(0, 19)}_${randomBytes(2).toString("hex")}`;
    const taken = (await q.query(`SELECT 1 FROM agents WHERE lower(handle) = lower($1) LIMIT 1`, [h])) as unknown[];
    if (taken.length) { if (i.handle) return { ok: false, status: 409, error: "handle_taken", message: "That handle is taken." }; continue; }
    try {
      await q.query(`INSERT INTO agents (id, name, key_hash, token_hash, handle, bio, avatar_url, banner_url, wallet_address, fid, chain, created_via) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'base','api')`,
        [id, name, hashKey(key), hashKey(token), h, cleanBio(i.bio) || null, avatar, banner, wallet, fid]);
      return { ok: true, id, handle: h, key, token };
    } catch (e) {
      if (/agents_handle_uq|duplicate key/i.test(e instanceof Error ? e.message : "")) { if (i.handle) return { ok: false, status: 409, error: "handle_taken", message: "That handle is taken." }; continue; }
      throw e;
    }
  }
  return { ok: false, status: 409, error: "handle_taken", message: "Could not find a free handle. Pass handle." };
}

export async function rotateKey(id: string): Promise<{ ok: true; key: string } | Fail> {
  const q = sql(); if (!q) return NC; await ensureSchema();
  const key = newKey();
  const r = (await q.query(`UPDATE agents SET key_hash = $1, key_rotated_at = now() WHERE id = $2 AND NOT disabled RETURNING id`, [hashKey(key), id])) as unknown[];
  return r.length ? { ok: true, key } : { ok: false, status: 404, error: "not_found", message: "agent not found" };
}
export async function rotateToken(id: string): Promise<{ ok: true; token: string } | Fail> {
  const q = sql(); if (!q) return NC; await ensureSchema();
  const token = newToken();
  const r = (await q.query(`UPDATE agents SET token_hash = $1, token_rotated_at = now() WHERE id = $2 AND NOT disabled RETURNING id`, [hashKey(token), id])) as unknown[];
  return r.length ? { ok: true, token } : { ok: false, status: 404, error: "not_found", message: "agent not found" };
}

/** Public profile by handle (case-insensitive). Never returns hashes/secrets. Hidden/disabled agents are not found. */
export async function agentByHandle(handle: string): Promise<AgentRow | null> {
  const q = sql(); if (!q) return null;
  const h = String(handle ?? "").trim().toLowerCase().replace(/^@/, "").slice(0, 32);
  if (!/^[a-z0-9_]{1,32}$/.test(h)) return null;
  await ensureSchema();
  const rows = (await q.query(`SELECT ${COLS} FROM agents WHERE lower(handle) = $1 AND NOT disabled AND NOT hidden LIMIT 1`, [h])) as AgentRow[];
  return rows[0] ?? null;
}
/** Public agent list (newest first). */
export async function listAgents(limit = 20): Promise<AgentRow[]> {
  const q = sql(); if (!q) return [];
  await ensureSchema();
  return (await q.query(`SELECT ${COLS} FROM agents WHERE NOT disabled AND NOT hidden ORDER BY created_at DESC LIMIT $1`, [Math.min(Math.max(1, Math.floor(limit) || 20), 50)])) as AgentRow[];
}
