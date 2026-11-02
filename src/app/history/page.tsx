import { Suspense } from "react";
import { connection } from "next/server";
import { DashCard, FeeBoard, Rows } from "@/components/fees/board";
import { fmtEth, listPayouts } from "@/lib/launch/fees";
export const metadata = { title: "History" };
const s = (a: string) => a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
async function Body() {
  await connection();
  const p = await listPayouts(50);
  return <FeeBoard title="History" purpose="Fee payout transactions on Base.">
    <DashCard title="Transactions"><Rows rows={p.map((x) => [`${s(x.txHash)} · ${x.createdAt.slice(0, 10)}`, fmtEth(x.wei)])} empty="No transactions yet." /></DashCard>
  </FeeBoard>;
}
export default function Page() { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body /></Suspense>; }
