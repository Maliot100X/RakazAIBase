import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Infra" };
export default function Page() {
  return <OperateTab title="Infra" purpose="Integrations and infra status.">
<LinkRow href="/health" label="Health" hint="live checks" />
<LinkRow href="/api/health" label="Health API" hint="json" />
  </OperateTab>;
}
