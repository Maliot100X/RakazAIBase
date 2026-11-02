import { connection, NextResponse } from "next/server";
import { executeEnabled, feeTotals, listLedger, listPayouts, SPLIT_LABEL } from "@/lib/launch/fees";
/** Read-only fee board data (Base, wei). */
export async function GET() {
  await connection();
  const [totals, ledger, payouts] = await Promise.all([feeTotals(), listLedger(50), listPayouts(50)]);
  return NextResponse.json({ chain: 8453, split: SPLIT_LABEL, dryRun: !executeEnabled(), totals, ledger, payouts });
}
