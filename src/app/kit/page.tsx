import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Kit" };
export default function Page() {
  return <OperateTab title="Kit" purpose="Builder kit: skill, MCP and API for agents.">
<LinkRow href="/skill.md" label="skill.md" hint="raw" />
<LinkRow href="/mcp" label="MCP" hint="endpoint" />
<LinkRow href="/openapi.json" label="OpenAPI" hint="json" />
  </OperateTab>;
}
