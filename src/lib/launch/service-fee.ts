/**
 * Self-launch service fee helpers for Base 8453 (ETH/wei). Pure, no network, no env.
 * Ported pattern from RakazaAiTerminal service-fee-core (MIT, ours) — Solana bits removed.
 * PREVIEW defaults only: no tx is built or sent in Phase 5.
 */
export const WEI_PER_ETH = BigInt("1000000000000000000");
export const MIN_FEE_ETH = 0.0001;
export const MAX_FEE_ETH = 0.05;
export const PREVIEW_FEE_USD = 5;
export const PREVIEW_FALLBACK_ETH = 0.002;
export const QUOTE_TTL_MS = 5 * 60 * 1000;

export interface FeeQuote { usd: number; eth: number; wei: string; ethUsd: number | null; source: "live" | "fallback"; at: number; preview: true }

const clamp = (eth: number) => Math.min(MAX_FEE_ETH, Math.max(MIN_FEE_ETH, eth));
export function ethToWei(eth: number): bigint { return BigInt(Math.round(eth * 1e9)) * BigInt(1000000000); }

/** USD → ETH at a price, clamped. null if price unusable. */
export function usdToEth(usd: number, ethUsd: number | null | undefined): number | null {
  if (!Number.isFinite(usd) || usd < 0) return null;
  if (usd === 0) return 0;
  if (!ethUsd || !Number.isFinite(ethUsd) || ethUsd < 10 || ethUsd > 1_000_000) return null;
  return clamp(usd / ethUsd);
}

export function makeQuote(i: { usd: number; ethUsd: number | null; fallbackEth?: number; now?: number }): FeeQuote {
  const at = i.now ?? Date.now();
  const live = usdToEth(i.usd, i.ethUsd);
  const eth = live ?? (i.usd === 0 ? 0 : clamp(i.fallbackEth ?? PREVIEW_FALLBACK_ETH));
  return { usd: i.usd, eth, wei: ethToWei(eth).toString(), ethUsd: live != null ? i.ethUsd : null, source: live != null ? "live" : "fallback", at, preview: true };
}

export function quoteFresh(at: number, now = Date.now()): boolean { return now - at >= -5000 && now - at <= QUOTE_TTL_MS; }
export function quoteAgeSec(at: number, now = Date.now()): number { return Math.max(0, Math.floor((now - at) / 1000)); }

export type FeeCheck = { ok: true } | { ok: false; error: string };
export function checkQuote(q: FeeQuote, now = Date.now()): FeeCheck {
  if (!quoteFresh(q.at, now)) return { ok: false, error: "Quote stale — refresh before launch" };
  if (q.eth !== 0 && (q.eth < MIN_FEE_ETH || q.eth > MAX_FEE_ETH)) return { ok: false, error: "Fee outside safe range" };
  return { ok: true };
}
