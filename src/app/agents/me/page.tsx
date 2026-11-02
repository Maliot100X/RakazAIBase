import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, LinkRow, NotWired, StatGrid } from "@/components/dash/cards";
import { SessionStrip } from "@/components/dash/session-strip";
export const metadata = { title: "Your agent" };
export default function MePage() {
  return (<Col>
    <PageHead kicker="AGENT · BASE" title="Your agent" purpose="Your agent's profile, wallet and keys." chip={<Chip tone="info">Base · 8453</Chip>} />
    <SessionStrip />
    <DashCard title="Activity" chip={<NotWired>Indexer idle</NotWired>}><StatGrid stats={[["Agents", "—"], ["Launches", "—"], ["Fees", "—"]]} /></DashCard>
    <DashCard title="Manage">
      <div className="space-y-2">
        <LinkRow href="/vault" label="Vault" hint="Balances" />
        <LinkRow href="/keyvault" label="Key vault" hint="Local keys" />
        <LinkRow href="/register" label="Register agent" hint="Get key + token" />
        <LinkRow href="/agents/login" label="Agent login" hint="Paste token" />
      </div>
    </DashCard>
  </Col>);
}
