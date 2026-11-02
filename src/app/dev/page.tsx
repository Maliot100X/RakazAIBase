import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Dev" };
export default function Page() {
  return <OperateTab title="Dev" purpose="Developer surface for Base agents.">
<LinkRow href="/docs" label="Docs" hint="read" />
<LinkRow href="/api/public/tools" label="Public tools" hint="json" />
  </OperateTab>;
}
