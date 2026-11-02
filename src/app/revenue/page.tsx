import { Suspense } from "react";
import { connection } from "next/server";
import { DashCard, FeeBoard } from "@/components/fees/board";
import { StatGrid } from "@/components/dash/cards";
import { feeTotals, fmtEth } from "@/lib/launch/fees";
export const metadata = { title: "Revenue" };
async function Body() {
  await connection();
  const t = await feeTotals();
  return <FeeBoard title="Revenue" purpose="Platform treasury share (30%) on Base.">
    <DashCard title="Platform"><StatGrid stats={[["Treasury 30%", fmtEth(t.treasuryWei)], ["Gross", fmtEth(t.totalWei)]]} /></DashCard>
  </FeeBoard>;
}
export default function Page() { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body /></Suspense>; }
