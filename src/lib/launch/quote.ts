import "server-only";
/** Uniswap/viem quote stub (Base 8453). No trading key exists in env → configured:false, idle. Never invents keys, never trades. */
export const uniswapIntegration = { configured: false as boolean, reason: "no trading key configured" };
export class QuoteNotConfiguredError extends Error { status = 503; constructor() { super("uniswap quote not configured"); } }
export type ExactInResult = { ok: true; amountOutWei: bigint } | { ok: false; idle: true; error: "quote_idle"; reason: string };
/** Returns structured idle result instead of throwing. Real routing not implemented → idle even if flagged configured. */
export async function quoteExactIn(_p: { tokenIn: `0x${string}`; tokenOut: `0x${string}`; amountInWei: bigint }): Promise<ExactInResult> {
  if (!uniswapIntegration.configured) return { ok: false, idle: true, error: "quote_idle", reason: uniswapIntegration.reason };
  return { ok: false, idle: true, error: "quote_idle", reason: "uniswap routing not implemented (preview)" };
}
