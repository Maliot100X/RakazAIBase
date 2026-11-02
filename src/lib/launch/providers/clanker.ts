import "server-only";
import { clankerDeploy, clankerIdleReason, clankerPrepare, clankerStatus } from "@/lib/clients/clanker";

/** Clanker launch provider: idle until key + CLANKER_ENABLED; even when ready it is prepare-only (no live deploy). */
export const clankerProvider = { id: "clanker" as const, status: clankerStatus, idleReason: clankerIdleReason, prepare: clankerPrepare, deploy: clankerDeploy, liveDeploy: false as const, deployStatus: "idle" as const };
