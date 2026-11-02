import { Chip, PageHead } from "@/components/shell/page-head";
import { Hero } from "@/components/shell/hero";
import { PageEnter } from "@/components/shell/page-enter";
import { Checklist, Col, DashCard, NotWired } from "@/components/dash/cards";
import { SessionStrip } from "@/components/dash/session-strip";
import { ProviderSwitch } from "@/components/launch/provider-switch";
import { SelfLaunchPanel } from "@/components/launch/self-launch-panel";
import { SponsoredPanel } from "@/components/launch/sponsored-panel";
import { sponsoredFlags } from "@/lib/launch/sponsored";
import { env, integrations } from "@/lib/env";
export const metadata = { title: "Launch" };
const field = "min-h-11 w-full rounded-xl border-2 border-rk-ink bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-rk-pink disabled:opacity-60";
export default function LaunchPage() {
  return (<Col>
    <PageHead title="Launch" purpose="I prepare it. A human says yes. Nothing is signed until you press Launch."
      chip={<><Chip tone="ok">Bankr · primary</Chip><Chip>Clanker · idle</Chip><Chip tone="info">Base · 8453</Chip></>} />
    <PageEnter>
      <Hero src="/brand/yuri-launch-pose.jpg" alt="Yuri launch pose" className="h-40 w-full object-cover" />
      <SessionStrip />
      <DashCard title="Provider">
        <ProviderSwitch providers={[
          { id: "bankr", label: "Bankr", status: integrations.bankr ? "ready" : "idle", note: "primary · job + poll" },
          { id: "clanker", label: "Clanker", status: "idle", note: "awaiting team key" },
        ]} />
      </DashCard>
      <DashCard title="Self-launch · your wallet" chip={<><NotWired>Dry-run</NotWired><a href="/self-launch" className="ml-2 text-xs underline">Open</a></>}>
        <SelfLaunchPanel clankerReady={integrations.clanker} selfLaunchEnabled={/^(true|1)$/i.test((env.SELF_LAUNCH_ENABLED ?? "").trim())} />
      </DashCard>
      <DashCard title="Sponsored · 70/30 via Bankr" chip={<NotWired>{sponsoredFlags().live ? "Live" : "Dry-run"}</NotWired>}>
        <SponsoredPanel live={sponsoredFlags().live} reason={sponsoredFlags().reason} />
      </DashCard>
      <DashCard title="Token draft" chip={<NotWired>Preview only</NotWired>}>
        <fieldset disabled className="space-y-2">
          <input className={field} placeholder="Name — e.g. Rakaza Bee" aria-label="Token name" />
          <input className={field} placeholder="Ticker — e.g. BEE" aria-label="Ticker" />
          <textarea className={`${field} min-h-20 py-2`} placeholder="Description" aria-label="Description" />
          <button className="rk-btn-honey w-full justify-center" type="button">Launch (later phase)</button>
        </fieldset>
      </DashCard>
      <DashCard title="Pre-flight">
        <Checklist items={[["Wallet on Base 8453", false], ["Metadata pinned (Pinata)", false], ["Human approval", false]]} />
      </DashCard>
    </PageEnter>
  </Col>);
}
