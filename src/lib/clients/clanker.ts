import "server-only";
import { env, integrations } from "@/lib/env";

/** Clanker (Base) client scaffold. Ready only when CLANKER_API_KEY set AND CLANKER_ENABLED true/1. Never deploys live. */
export const clankerEnabled = () => /^(true|1)$/i.test(env.CLANKER_ENABLED.trim());
export const clankerPendingTeamKey = () => /^(true|1)$/i.test(env.CLANKER_PENDING_TEAM_KEY.trim());
export const clankerKeySet = () => env.CLANKER_API_KEY.trim().length > 0;

export type ClankerStatus = "ready" | "idle";
export function clankerStatus(): ClankerStatus {
  return integrations.clanker ? "ready" : "idle";
}
export function clankerIdleReason(): string | null {
  if (!clankerKeySet()) return "CLANKER_API_KEY not set";
  if (!clankerEnabled()) return "CLANKER_ENABLED off";
  return integrations.clanker ? null : "clanker not configured";
}

export type ClankerDeployInput = { name: string; symbol: string; image?: string; metadataUri?: string; admin?: `0x${string}` };
export type ClankerPrepareResult =
  | { ok: true; prepareOnly: true; execute: false; endpoint: string; payload: Record<string, unknown> }
  | { ok: false; idle: true; reason: string };
export type ClankerDeployResult = { ok: false; idle: true; error: "deploy_disabled" | "not_configured"; reason: string };

/** Prepare-only: returns what WOULD be sent. No network call, no signing. */
export function clankerPrepare(input: ClankerDeployInput): ClankerPrepareResult {
  const reason = clankerIdleReason();
  if (reason) return { ok: false, idle: true, reason };
  const base = (env.CLANKER_API_URL || "https://www.clanker.world/api").replace(/\/$/, "");
  return {
    ok: true, prepareOnly: true, execute: false, endpoint: `${base}/tokens/deploy`,
    payload: { chainId: 8453, name: input.name, symbol: input.symbol, image: input.image ?? null, metadataUri: input.metadataUri ?? null, tokenAdmin: input.admin ?? null },
  };
}

/** Live deploy is disabled in this slice regardless of config. Never throws a fake success. */
export async function clankerDeploy(_input: ClankerDeployInput): Promise<ClankerDeployResult> {
  const reason = clankerIdleReason();
  if (reason) return { ok: false, idle: true, error: "not_configured", reason };
  return { ok: false, idle: true, error: "deploy_disabled", reason: "live Clanker deploy disabled by Lead (prepare-only)" };
}
