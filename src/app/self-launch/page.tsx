import { Suspense } from "react";
import { connection } from "next/server";
import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, LinkRow, NotWired, StatGrid } from "@/components/dash/cards";
import { SelfLaunchPanel } from "@/components/launch/self-launch-panel";
import { quoteServiceFee } from "@/lib/launch/service-fee-quote";
import { env, integrations } from "@/lib/env";
import { sponsoredFlags } from "@/lib/launch/sponsored";
export const metadata = { title: "Self-launch" };
async function Body() {
  await connection();
  const q = await quoteServiceFee().catch(() => null);
  const sf = sponsoredFlags();
  const bankrLive = sf.live && integrations.bankr;
  return (<Col>
    <PageHead kicker="LAUNCH · BASE" title="Self-launch" purpose="Launch from your own wallet on Base, or use Bankr sponsored 70/30 from the Launch hub. Self-launch plans here never auto-sign."
      chip={<><Chip tone={bankrLive ? "ok" : "pending"}>{bankrLive ? "Bankr · live" : "Bankr · dry"}</Chip><Chip>Clanker · idle</Chip><Chip tone="info">Base · 8453</Chip></>} />
    <DashCard title="Service fee quote" chip={<Chip tone="info">Preview</Chip>}>
      {q ? <StatGrid stats={[["USD", `$${q.quote.usd}`], ["ETH", q.quote.eth.toFixed(5)], ["Source", q.quote.source]]} /> : <p className="text-sm">Quote unavailable (idle).</p>}
    </DashCard>
    <DashCard title="Self-launch · your wallet" chip={<Chip tone="pending">Plan only</Chip>}>
      <SelfLaunchPanel clankerReady={integrations.clanker} selfLaunchEnabled={/^(true|1)$/i.test((env.SELF_LAUNCH_ENABLED ?? "").trim())} />
    </DashCard>
    <DashCard title="More"><div className="space-y-2"><LinkRow href="/launch" label="Launch hub · Bankr sponsored 70/30" hint={bankrLive ? "Live when owner approves" : "Dry until flags"} /><LinkRow href="/settings/integrations" label="Integrations" hint="Flags" /></div></DashCard>
  </Col>);
}
export default function SelfLaunchPage() { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body /></Suspense>; }
