import { Suspense } from "react";
import { connection } from "next/server";
import { DashCard, FeeBoard, Rows } from "@/components/fees/board";
import { fmtEth, listPayouts } from "@/lib/launch/fees";
export const metadata = { title: "Rewards" };
const s = (a: string) => a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
async function Body() {
  await connection();
  const p = await listPayouts(50);
  return <FeeBoard title="Rewards" purpose="Launcher rewards (70%) per wallet.">
    <DashCard title="Payouts"><Rows rows={p.map((x) => [s(x.wallet), fmtEth(x.wei)])} empty="No payouts recorded yet." /></DashCard>
  </FeeBoard>;
}
export default function Page() { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body /></Suspense>; }
