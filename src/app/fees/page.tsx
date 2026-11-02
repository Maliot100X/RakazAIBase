import { Suspense } from "react";
import { connection } from "next/server";
import { DashCard, FeeBoard } from "@/components/fees/board";
import { StatGrid } from "@/components/dash/cards";
import { feeTotals, fmtEth, SPLIT_LABEL } from "@/lib/launch/fees";
import { quoteServiceFee } from "@/lib/launch/service-fee-quote";
export const metadata = { title: "Fees" };
async function Body() {
  await connection();
  const t = await feeTotals();
  const q = await quoteServiceFee().catch(() => null);
  return <FeeBoard title="Fees" purpose={`Creator fees on Base, split ${SPLIT_LABEL}. Read-only; no claims.`}>
    <DashCard title="Totals"><StatGrid stats={[["Collected", fmtEth(t.totalWei)], ["Launchers 70%", fmtEth(t.launcherWei)], ["Platform 30%", fmtEth(t.treasuryWei)], ["Payouts", String(t.payouts)]]} /></DashCard>
    <DashCard title="Service fee quote (dry-run)">{q ? <StatGrid stats={[["Fee", `${q.quote.eth} ETH`], ["USD", `$${q.quote.usd}`], ["ETH/USD", q.ethUsd ? `$${q.ethUsd} · ${q.ethUsdSource}` : "idle · fallback"], ["Caps", `${q.caps.maxLaunchEth ?? "—"} / ${q.caps.maxDailySpendEth ?? "—"} ETH (not enforced)`]]} /> : <p className="text-sm opacity-70">Quote idle.</p>}</DashCard>
    <DashCard title="Bankr fees"><p className="text-sm opacity-70">Bankr reading/claiming fees: read-only, not wired (HOLD).</p></DashCard>
  </FeeBoard>;
}
export default function Page() { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body /></Suspense>; }
