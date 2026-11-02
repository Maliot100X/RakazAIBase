import "server-only";
import { defaultLaunchProvider, type LaunchProviderId } from "./provider";
import { clankerProvider } from "./providers/clanker";
import { quoteServiceFee, type ServiceFeeQuoteResult } from "./service-fee-quote";
import { executeEnabled } from "./fees";
import { buildSelfLaunchTx, type BuildTxResult } from "./build-tx";

export type SelfLaunchInput = { name?: unknown; symbol?: unknown; image?: unknown; admin?: unknown };
export type SelfLaunchPlan = {
  ok: boolean; dryRun: true; execute: false; chain: "base"; provider: LaunchProviderId | null; reason: string;
  errors?: string[]; input?: { name: string; symbol: string };
  quote: ServiceFeeQuoteResult["quote"]; caps: ServiceFeeQuoteResult["caps"]; ethUsdSource: ServiceFeeQuoteResult["ethUsdSource"];
  flags: { executeEnabled: boolean; selfLaunchEnabled: boolean; clanker: "ready" | "idle" };
  tx: BuildTxResult;
};
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const ADDR = /^0x[0-9a-fA-F]{40}$/;

export function validateSelfLaunch(i: SelfLaunchInput): { errors: string[]; name: string; symbol: string; image?: string; admin?: `0x${string}` } {
  const name = s(i.name), symbol = s(i.symbol).toUpperCase(), image = s(i.image) || undefined, admin = s(i.admin) || undefined;
  const errors: string[] = [];
  if (name.length < 2 || name.length > 32) errors.push("name must be 2-32 chars");
  if (!/^[A-Z0-9]{2,10}$/.test(symbol)) errors.push("symbol must be 2-10 A-Z/0-9");
  if (admin && !ADDR.test(admin)) errors.push("admin must be 0x address");
  return { errors, name, symbol, image, admin: admin as `0x${string}` | undefined };
}

/** Dry self-launch plan. Never signs/sends. Builds an unsigned-step preview only when Clanker is ready. */
export async function planSelfLaunch(i: SelfLaunchInput): Promise<SelfLaunchPlan> {
  const q = await quoteServiceFee();
  const v = validateSelfLaunch(i);
  const provider = defaultLaunchProvider();
  const clanker = clankerProvider.status();
  const flags = { executeEnabled: executeEnabled(), selfLaunchEnabled: /^(true|1)$/i.test((process.env.SELF_LAUNCH_ENABLED ?? "").trim()), clanker };
  const tx = buildSelfLaunchTx({ name: v.name, symbol: v.symbol, image: v.image, admin: v.admin, feeWei: q.quote.wei, valid: v.errors.length === 0 });
  const reason = v.errors.length ? "invalid input" : provider === null ? "launch idle: no provider ready (Bankr/Clanker)" : `dry preview via ${provider}; no tx signed or sent`;
  return { ok: v.errors.length === 0, dryRun: true, execute: false, chain: "base", provider, reason, ...(v.errors.length ? { errors: v.errors } : {}),
    input: { name: v.name, symbol: v.symbol }, quote: q.quote, caps: q.caps, ethUsdSource: q.ethUsdSource, flags, tx };
}
