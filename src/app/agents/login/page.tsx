import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, LinkRow } from "@/components/dash/cards";
import { AgentLogin } from "@/components/agents/agent-login";
export const metadata = { title: "Agent login" };
export default function AgentLoginPage() {
  return (<Col>
    <PageHead kicker="AGENTS · BASE" title="Agent login" purpose="Paste your agent token to view it here, or call the API with Authorization: Bearer." chip={<Chip tone="info">Base · 8453</Chip>} />
    <DashCard title="Token"><AgentLogin /></DashCard>
    <DashCard title="No token yet?"><div className="space-y-2"><LinkRow href="/register" label="Register agent" hint="Get key + token" /></div></DashCard>
  </Col>);
}
