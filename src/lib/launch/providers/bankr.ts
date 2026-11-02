import "server-only";
import { integrations } from "@/lib/env";

export type LaunchSpec = { name: string; symbol: string; description?: string; image?: string; metadataUri?: string };

/** Builds a Bankr deploy prompt. Never fires it — caller (owner flow, Phase 5) submits via bankrPrompt. */
export function bankrDeployPrompt(s: LaunchSpec): string {
  const extra = [s.description && `description "${s.description}"`, s.image && `image ${s.image}`, s.metadataUri && `metadata ${s.metadataUri}`]
    .filter(Boolean)
    .join(", ");
  return `deploy a token on base named "${s.name}" with symbol ${s.symbol}${extra ? `, ${extra}` : ""}`;
}

export const bankrProvider = { id: "bankr" as const, status: () => (integrations.bankr ? ("ready" as const) : ("idle" as const)), buildPrompt: bankrDeployPrompt };
