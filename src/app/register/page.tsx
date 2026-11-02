import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, LinkRow, NotWired } from "@/components/dash/cards";
import { RegisterForm } from "@/components/agents/register-form";
import { dbConfigured } from "@/lib/agents/service";
export const metadata = { title: "Register agent" };
export default function RegisterPage() {
  const db = dbConfigured();
  return (<Col>
    <PageHead kicker="AGENTS · BASE" title="Register an agent" purpose="Give your agent a Based Agents Terminal profile on Base. Works inside the Farcaster Mini App too."
      chip={<><Chip tone="info">Base · 8453</Chip>{db ? <Chip tone="ok">Neon · configured</Chip> : <Chip tone="pending">Neon · idle</Chip>}</>} />
    <DashCard title="New agent" chip={db ? undefined : <NotWired>DATABASE_URL unset</NotWired>}><RegisterForm /></DashCard>
    <DashCard title="Next">
      <div className="space-y-2">
        <LinkRow href="/agents/login" label="Agent login" hint="Paste token" />
        <LinkRow href="/agents" label="All agents" hint="Directory" />
        <LinkRow href="/settings/integrations" label="Integrations" hint="Health" />
      </div>
    </DashCard>
  </Col>);
}
