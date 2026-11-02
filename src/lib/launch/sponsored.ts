import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { env, integrations } from "@/lib/env";
import { sessionSecret } from "@/lib/auth/session";
import { redis } from "@/lib/upstash";
import { buildSplit, isEvmAddress, verifySplit, type SplitShare } from "@/lib/launch/sponsored-split";

const on = (v: string) => /^(true|1)$/i.test((v ?? "").trim());
/** Per-agent spend caps (constants; no new env keys). */
export const SPONSORED_CAPS = { maxLaunchesPerAgentPerDay: 1, maxSpendEthPerAgent: 0 } as const;
export const TICKET_TTL_MS = 10 * 60 * 1000;

export function sponsoredFlags() {
  const execute = on(env.EXECUTE_ENABLED), sponsored = on(env.SPONSORED_ENABLED);
  const treasury = isEvmAddress(env.PLATFORM_TREASURY_ADDRESS) ? env.PLATFORM_TREASURY_ADDRESS : null;
  const live = execute && sponsored && integrations.bankr && !!treasury;
  const reason = !execute ? "EXECUTE_ENABLED=false" : !sponsored ? "SPONSORED_ENABLED=false" : !integrations.bankr ? "bankr_idle" : !treasury ? "treasury_unset" : null;
  return { execute, sponsored, bankr: integrations.bankr, treasury, live, reason };
}

export type Draft = { agentId: string; name: string; symbol: string; feeRecipient: string; description?: string };
export type Ticket = Draft & { id: string; split: SplitShare[]; dryRun: boolean; exp: number };

const b64 = (s: string) => Buffer.from(s).toString("base64url");
const mac = (secret: string, body: string) => createHmac("sha256", secret).update(body).digest("base64url");

export function signTicket(t: Ticket): string | null {
  const s = sessionSecret(); if (!s) return null;
  const body = b64(JSON.stringify(t)); return `${body}.${mac(s, body)}`;
}
export function readTicket(tok: string, now = Date.now()): Ticket | null {
  const s = sessionSecret(); const [body, sig] = (tok ?? "").split(".");
  if (!s || !body || !sig) return null;
  const want = Buffer.from(mac(s, body)), got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try { const t = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket; return t.exp > now ? t : null; } catch { return null; }
}

export function validateDraft(b: Record<string, unknown>, treasury: string | null): { draft?: Draft; problems: string[] } {
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const d: Draft = { agentId: str(b.agentId, 64), name: str(b.name, 48), symbol: str(b.symbol, 12).toUpperCase(), feeRecipient: str(b.feeRecipient, 42), description: str(b.description, 280) || undefined };
  const p: string[] = [];
  if (!/^[\w.-]{1,64}$/.test(d.agentId)) p.push("agentId required");
  if (!d.name) p.push("name required");
  if (!/^[A-Z0-9]{2,12}$/.test(d.symbol)) p.push("symbol 2–12 A-Z0-9");
  if (!isEvmAddress(d.feeRecipient)) p.push("feeRecipient must be a 0x address");
  if (treasury) p.push(...verifySplit(buildSplit(d.feeRecipient, treasury), treasury).problems);
  return p.length ? { problems: p } : { draft: d, problems: [] };
}

/** Run status + per-agent caps. Upstash when configured (rk:sponsored:*), else process-local Map fallback. */
export type Run = { id: string; agentId: string; state: "idle" | "blocked" | "submitted"; reason?: string; bankrJobId?: string; tokenAddress?: string; at: number };
export type Storage = "upstash" | "memory";
const RUN_TTL_S = 7 * 86_400, USES_TTL_S = 2 * 86_400, DAY_MS = 86_400_000;
const kRun = (id: string) => `rk:sponsored:run:${id}`, kUses = (a: string) => `rk:sponsored:uses:${a}`;
const kAddr = (a: string) => `rk:sponsored:addr:${a.toLowerCase()}`, kList = "rk:sponsored:runs";
const g = globalThis as unknown as { __rkSponsored?: Map<string, Run>; __rkSponsoredUses?: Map<string, number[]> };
const memRuns: Map<string, Run> = (g.__rkSponsored ??= new Map());
const memUses: Map<string, number[]> = (g.__rkSponsoredUses ??= new Map());
export const storageMode = (): Storage => (redis() ? "upstash" : "memory");

export async function setRun(run: Run): Promise<Storage> {
  memRuns.set(run.id, run);
  const r = redis(); if (!r) return "memory";
  try {
    await r.set(kRun(run.id), run, { ex: RUN_TTL_S });
    if (run.tokenAddress && isEvmAddress(run.tokenAddress)) await r.set(kAddr(run.tokenAddress), run.id, { ex: RUN_TTL_S });
    await r.lpush(kList, run.id); await r.ltrim(kList, 0, 99); await r.expire(kList, RUN_TTL_S);
    return "upstash";
  } catch { return "memory"; }
}
export async function getRun(id: string): Promise<{ run: Run | null; storage: Storage }> {
  const r = redis();
  if (r) { try { const v = await r.get<Run>(kRun(id)); if (v) return { run: v, storage: "upstash" }; } catch { /* fall back */ } }
  return { run: memRuns.get(id) ?? null, storage: "memory" };
}
export async function getRunByAddress(addr: string): Promise<{ run: Run | null; storage: Storage }> {
  const r = redis();
  if (r) { try { const id = await r.get<string>(kAddr(addr)); if (id) return getRun(String(id)); } catch { /* fall back */ } }
  const a = addr.toLowerCase();
  return { run: [...memRuns.values()].find((x) => x.tokenAddress?.toLowerCase() === a) ?? null, storage: "memory" };
}
export async function listRuns(n = 20): Promise<{ runs: Run[]; storage: Storage }> {
  const r = redis();
  if (r) {
    try {
      const ids = [...new Set((await r.lrange<string>(kList, 0, n * 2)).map(String))].slice(0, n);
      const out = (await Promise.all(ids.map((id) => r.get<Run>(kRun(id))))).filter((x): x is Run => !!x);
      return { runs: out, storage: "upstash" };
    } catch { /* fall back */ }
  }
  return { runs: [...memRuns.values()].sort((a, b) => b.at - a.at).slice(0, n), storage: "memory" };
}
export async function capOk(agentId: string, now = Date.now()): Promise<boolean> {
  const r = redis();
  if (r) {
    try { const day = ((await r.lrange<number>(kUses(agentId), 0, -1)) ?? []).map(Number).filter((t) => now - t < DAY_MS); return day.length < SPONSORED_CAPS.maxLaunchesPerAgentPerDay; }
    catch { /* fall back */ }
  }
  const day = (memUses.get(agentId) ?? []).filter((t) => now - t < DAY_MS);
  memUses.set(agentId, day);
  return day.length < SPONSORED_CAPS.maxLaunchesPerAgentPerDay;
}
export async function markUse(agentId: string, now = Date.now()): Promise<Storage> {
  memUses.set(agentId, [...(memUses.get(agentId) ?? []), now]);
  const r = redis(); if (!r) return "memory";
  try { await r.lpush(kUses(agentId), now); await r.ltrim(kUses(agentId), 0, 49); await r.expire(kUses(agentId), USES_TTL_S); return "upstash"; }
  catch { return "memory"; }
}
export const newRunId = () => randomUUID();

export function bankrLaunchPrompt(t: Ticket): string {
  return `Deploy a token on Base named "${t.name}" with symbol ${t.symbol}. Fee recipient: ${t.feeRecipient}.${t.description ? ` Description: ${t.description}` : ""}`;
}
