import { connection, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/launch/cron-auth";
import { executeEnabled, feeTotals, qstashConfigured, recordLedgerEvent, SPLIT_LABEL } from "@/lib/launch/fees";
/** Fee distribution tick. Dry-run only in Phase 7: computes the 70/30 split, never claims or sends. */
async function handle(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!qstashConfigured()) return NextResponse.json({ ok: true, idle: true, reason: "QSTASH_TOKEN not set" });
  const totals = await feeTotals();
  const ledger = await recordLedgerEvent({ kind: "distribute_dry", tokenAddress: null, amountWei: totals.totalWei, meta: totals });
  // Even with EXECUTE_ENABLED on, this slice has no transfer code: always dry, never a txHash.
  return NextResponse.json({ ok: true, dryRun: true, executeEnabled: executeEnabled(), transferred: false, txHash: null, ledger, split: SPLIT_LABEL, totals, note: "no claim/transfer performed" });
}
export const GET = handle;
export const POST = handle;
