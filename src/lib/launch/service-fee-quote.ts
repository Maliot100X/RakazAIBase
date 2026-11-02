import "server-only";
import { makeQuote, PREVIEW_FALLBACK_ETH, PREVIEW_FEE_USD, type FeeQuote } from "./service-fee";
import { getEthUsd, type EthUsdSource } from "./eth-usd";
const num = (v: string | undefined): number | null => { if (!v || !v.trim()) return null; const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : null; };
export interface ServiceFeeQuoteResult { ok: true; preview: true; execute: false; quote: FeeQuote; ethUsd: number | null; ethUsdSource: EthUsdSource; caps: { maxLaunchEth: number | null; maxDailySpendEth: number | null; enforced: false }; config: { usdFromEnv: boolean; fallbackEthFromEnv: boolean } }
/** Env-driven dry service-fee quote. Reads SELF_LAUNCH_SERVICE_FEE_USD/ETH + caps. No spend enforcement, no tx. */
export async function quoteServiceFee(): Promise<ServiceFeeQuoteResult> {
  const envUsd = num(process.env.SELF_LAUNCH_SERVICE_FEE_USD), envEth = num(process.env.SELF_LAUNCH_SERVICE_FEE_ETH);
  const p = await getEthUsd();
  const quote = makeQuote({ usd: envUsd ?? PREVIEW_FEE_USD, ethUsd: p.ethUsd, fallbackEth: envEth ?? PREVIEW_FALLBACK_ETH });
  return { ok: true, preview: true, execute: false, quote, ethUsd: p.ethUsd, ethUsdSource: p.source,
    caps: { maxLaunchEth: num(process.env.MAX_LAUNCH_ETH), maxDailySpendEth: num(process.env.MAX_DAILY_SPEND_ETH), enforced: false },
    config: { usdFromEnv: envUsd != null, fallbackEthFromEnv: envEth != null } };
}
