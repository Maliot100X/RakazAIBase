import "server-only";
import { sql } from "@/lib/db";
import { buildSplit, CREATOR_BPS, TOTAL_BPS, TREASURY_BPS, type SplitShare } from "./sponsored-split";

/** Base 8453 fee split + ledger helpers (wei only). Dry-run by default; never spends. */
export const executeEnabled = () => /^(true|1)$/i.test((process.env.EXECUTE_ENABLED ?? "").trim());
export const qstashConfigured = () => (process.env.QSTASH_TOKEN ?? "").length > 0;

/** 70% launcher / 30% platform treasury. */
export function rewardRecipients(launcher: string, treasury = process.env.PLATFORM_TREASURY_ADDRESS ?? ""): SplitShare[] {
  return buildSplit(launcher, treasury);
}

/** Integer split of wei; remainder (dust) goes to the launcher so the sum is exact. */
export function splitWei(totalWei: bigint): { launcherWei: bigint; treasuryWei: bigint } {
  const treasuryWei = (totalWei * BigInt(TREASURY_BPS)) / BigInt(TOTAL_BPS);
  return { launcherWei: totalWei - treasuryWei, treasuryWei };
}
export const SPLIT_LABEL = `${CREATOR_BPS / 100}/${TREASURY_BPS / 100}`;

export type FeeEvent = { kind: string; tokenAddress: string | null; txHash: string | null; amountWei: string; createdAt: string; meta?: unknown };
export type Payout = { tokenAddress: string; wallet: string; wei: string; txHash: string; createdAt: string };

/** In-memory fallback for dry-run events when Neon is not configured (per-instance, non-durable). */
const mem: FeeEvent[] = [];
export function recordDryEvent(e: Omit<FeeEvent, "createdAt">) {
  mem.unshift({ ...e, createdAt: new Date().toISOString() });
  mem.length = Math.min(mem.length, 200);
}

/** Dry ledger write: Neon when available, else memory. Never accepts/invents a txHash (dry events have none). */
export async function recordLedgerEvent(e: { kind: string; tokenAddress: string | null; amountWei: string; meta?: Record<string, unknown> }): Promise<"neon" | "memory"> {
  const meta = { ...(e.meta ?? {}), dryRun: true, executeEnabled: executeEnabled() };
  const q = sql();
  if (q) {
    try {
      await q`INSERT INTO ledger (kind, chain, token_address, tx_hash, amount_wei, meta) VALUES (${e.kind}, 'base', ${e.tokenAddress}, NULL, ${e.amountWei}, ${JSON.stringify(meta)}::jsonb)`;
      return "neon";
    } catch { /* fall through */ }
  }
  recordDryEvent({ kind: e.kind, tokenAddress: e.tokenAddress, txHash: null, amountWei: e.amountWei, meta });
  return "memory";
}

export async function listLedger(limit = 50): Promise<{ source: "neon" | "memory"; rows: FeeEvent[] }> {
  const q = sql();
  if (!q) return { source: "memory", rows: mem.slice(0, limit) };
  try {
    const r = (await q`SELECT kind, token_address, tx_hash, amount_wei::text AS amount_wei, created_at, meta FROM ledger WHERE chain = 'base' ORDER BY created_at DESC LIMIT ${limit}`) as Record<string, unknown>[];
    return { source: "neon", rows: r.map((x) => ({ kind: String(x.kind), tokenAddress: (x.token_address as string) ?? null, txHash: (x.tx_hash as string) ?? null, amountWei: String(x.amount_wei), createdAt: new Date(x.created_at as string).toISOString(), meta: x.meta })) };
  } catch { return { source: "memory", rows: mem.slice(0, limit) }; }
}

export async function listPayouts(limit = 50): Promise<Payout[]> {
  const q = sql();
  if (!q) return [];
  try {
    const r = (await q`SELECT token_address, wallet, wei::text AS wei, tx_hash, created_at FROM fee_payouts WHERE chain = 'base' ORDER BY created_at DESC LIMIT ${limit}`) as Record<string, unknown>[];
    return r.map((x) => ({ tokenAddress: String(x.token_address), wallet: String(x.wallet), wei: String(x.wei), txHash: String(x.tx_hash), createdAt: new Date(x.created_at as string).toISOString() }));
  } catch { return []; }
}

export async function feeTotals(): Promise<{ totalWei: string; launcherWei: string; treasuryWei: string; payouts: number }> {
  const p = await listPayouts(500);
  const total = p.reduce((a, x) => a + BigInt(x.wei.split(".")[0] || "0"), BigInt(0));
  const s = splitWei(total);
  return { totalWei: total.toString(), launcherWei: s.launcherWei.toString(), treasuryWei: s.treasuryWei.toString(), payouts: p.length };
}

export const fmtEth = (wei: string) => { try { const w = BigInt(wei); return `${(Number(w / BigInt(1e12)) / 1e6).toFixed(6)} ETH`; } catch { return "—"; } };
