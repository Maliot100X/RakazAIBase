import { Suspense } from "react";
import { connection } from "next/server";
import { DashCard, FeeBoard, Rows } from "@/components/fees/board";
import { fmtEth, listLedger } from "@/lib/launch/fees";
export const metadata = { title: "Ledger" };
async function Body() {
  await connection();
  const l = await listLedger(50);
  return <FeeBoard title="Ledger" purpose={`Fee events (source: ${l.source}).`}>
    <DashCard title="Events"><Rows rows={l.rows.map((x) => [x.kind, fmtEth(x.amountWei)])} empty="No ledger events yet." /></DashCard>
  </FeeBoard>;
}
export default function Page() { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body /></Suspense>; }
