import "server-only";
/** Live ETH/USD (server). Public no-secret sources first; 30s cache; null on failure. Never throws, never invents. */
export type EthUsdSource = "coingecko" | "dexscreener" | "alchemy" | "none";
const TTL = 30_000;
let cache: { v: number | null; src: EthUsdSource; at: number } | null = null;
const ok = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 10 && n <= 1_000_000;
async function j(url: string, init?: RequestInit): Promise<unknown> {
  const r = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(4000) });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}
async function coingecko() { const d = (await j("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd")) as { ethereum?: { usd?: number } }; return d.ethereum?.usd; }
async function dexscreener() {
  const d = (await j("https://api.dexscreener.com/latest/dex/tokens/0x4200000000000000000000000000000000000006")) as { pairs?: { chainId?: string; baseToken?: { address?: string }; priceUsd?: string; liquidity?: { usd?: number } }[] };
  const p = (d.pairs ?? []).filter((x) => x.chainId === "base" && x.baseToken?.address?.toLowerCase() === "0x4200000000000000000000000000000000000006").sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
  return p?.priceUsd ? Number(p.priceUsd) : undefined;
}
async function alchemy() {
  const k = process.env.ALCHEMY_API_KEY; if (!k) return undefined;
  const d = (await j(`https://api.g.alchemy.com/prices/v1/${encodeURIComponent(k)}/tokens/by-symbol?symbols=ETH`)) as { data?: { prices?: { currency?: string; value?: string }[] }[] };
  const v = d.data?.[0]?.prices?.find((x) => x.currency === "usd")?.value; return v ? Number(v) : undefined;
}
export async function getEthUsd(): Promise<{ ethUsd: number | null; source: EthUsdSource; at: number }> {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return { ethUsd: cache.v, source: cache.src, at: cache.at };
  const tries: [EthUsdSource, () => Promise<number | undefined>][] = [["coingecko", coingecko], ["dexscreener", dexscreener], ["alchemy", alchemy]];
  for (const [src, fn] of tries) {
    try { const v = await fn(); if (ok(v)) { cache = { v, src, at: now }; return { ethUsd: v, source: src, at: now }; } } catch { /* idle */ }
  }
  cache = { v: null, src: "none", at: now };
  return { ethUsd: null, source: "none", at: now };
}
