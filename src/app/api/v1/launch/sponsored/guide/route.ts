import { NextResponse, connection } from "next/server";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { CREATOR_BPS, TREASURY_BPS } from "@/lib/launch/sponsored-split";
import { SPONSORED_CAPS, TICKET_TTL_MS, sponsoredFlags, storageMode } from "@/lib/launch/sponsored";

export const OPTIONS = preflight;
/** Public dry guide for the sponsored 70/30 Base launch. No secrets. */
export async function GET() {
  await connection();
  const f = sponsoredFlags();
  return NextResponse.json({
    ok: true, chain: "base",
    steps: [
      "POST /api/v1/launch/sponsored/prepare (owner) { agentId, name, symbol, feeRecipient: 0x… } → signed ticket",
      "Owner reviews; POST /api/v1/launch/sponsored/start { ticket, approve: true }",
      "Poll GET /api/v1/launch/sponsored/status/{id} or GET /api/v1/launch/sponsored/{id | 0xTokenAddress} (owner)",
      "GET /api/v1/launch/sponsored/list (owner) → recent runs",
    ],
    split: { creatorBps: CREATOR_BPS, treasuryBps: TREASURY_BPS, label: "70/30 creator/treasury" },
    provider: "bankr", clanker: "idle", dryRun: !f.live, ticketTtlMs: TICKET_TTL_MS, caps: SPONSORED_CAPS,
    flags: { execute: f.execute, sponsored: f.sponsored, bankr: f.bankr, treasurySet: !!f.treasury, live: f.live, reason: f.reason },
    storage: storageMode(),
    note: "Token address lookup returns not_found until an on-chain address is recorded; dry-run runs are only addressable by run id.",
  }, { headers: { ...CORS, ...NO_STORE } });
}
