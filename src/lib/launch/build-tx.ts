import "server-only";
import { clankerPrepare } from "@/lib/clients/clanker";

export type BuildTxStep = { step: string; to: string | null; valueWei: string; note: string };
export type BuildTxResult =
  | { ok: false; idle: true; reason: string }
  | { ok: true; preview: true; executable: false; signed: false; sent: false; steps: BuildTxStep[]; clankerPayload: Record<string, unknown> };

/** Self-launch tx scaffold (Base 8453). NEVER signs, NEVER sends, NEVER reports on-chain success. */
export function buildSelfLaunchTx(i: { name: string; symbol: string; image?: string; admin?: `0x${string}`; feeWei: string; valid: boolean }): BuildTxResult {
  if (!i.valid) return { ok: false, idle: true, reason: "invalid input" };
  const p = clankerPrepare({ name: i.name, symbol: i.symbol, image: i.image, admin: i.admin });
  if (!p.ok) return { ok: false, idle: true, reason: `clanker idle: ${p.reason}` };
  const treasury = (process.env.PLATFORM_TREASURY_ADDRESS ?? "").trim() || null;
  return { ok: true, preview: true, executable: false, signed: false, sent: false, clankerPayload: p.payload, steps: [
    { step: "create_token_via_clanker", to: p.endpoint, valueWei: "0", note: "prepare-only; live deploy disabled" },
    { step: "pay_service_fee", to: treasury, valueWei: i.feeWei, note: treasury ? "would transfer fee wei to platform treasury" : "PLATFORM_TREASURY_ADDRESS not set" },
  ] };
}
