import { timingSafeEqual } from "node:crypto";
import { dbConfigured, getAgentByTokenHash, getAgentByKeyHash, touch } from "@/lib/agents/service";

/** Bearer agent auth using only existing env names: API_SERVER_KEY, RAKAZA_LIVE_AGENT_API_KEY, RAKAZA_LIVE_AGENT_BEARER. */
const KEYS = ["API_SERVER_KEY", "RAKAZA_LIVE_AGENT_API_KEY", "RAKAZA_LIVE_AGENT_BEARER"] as const;
export type Caller = { kind: "agent"; via: (typeof KEYS)[number] } | { kind: "agent"; via: "db"; id: string; handle: string; cred: "token" | "key" };

const eq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
export const agentAuthConfigured = () => KEYS.some((k) => (process.env[k] ?? "").trim().length > 0);

/** Env bearers first (owner/system), then Neon agents.token_hash, then key_hash. Raw secrets are never logged. */
export async function agentAuth(req: Request): Promise<{ caller: Caller } | { status: 401 | 503; error: string }> {
  const db = dbConfigured();
  if (!agentAuthConfigured() && !db) return { status: 503, error: "not_configured: agent bearer key unset and DATABASE_URL unset" };
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  if (!m) return { status: 401, error: "missing Authorization: Bearer <agent key>" };
  const tok = m[1].trim();
  for (const k of KEYS) { const v = (process.env[k] ?? "").trim(); if (v && eq(tok, v)) return { caller: { kind: "agent", via: k } }; }
  if (db && /^rkb?_[A-Za-z0-9_-]{16,80}$/.test(tok)) {
    try {
      const t = await getAgentByTokenHash(tok);
      if (t) { void touch(t.id); return { caller: { kind: "agent", via: "db", id: t.id, handle: t.handle, cred: "token" } }; }
      const k = await getAgentByKeyHash(tok);
      if (k) { void touch(k.id); return { caller: { kind: "agent", via: "db", id: k.id, handle: k.handle, cred: "key" } }; }
    } catch { return { status: 503, error: "db_unavailable" }; }
  }
  return { status: 401, error: "invalid agent key" };
}

export const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version" };
export const NO_STORE = { "Cache-Control": "no-store" };
export const preflight = () => new Response(null, { status: 204, headers: CORS });
export const siteUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "") || "https://example.invalid";
