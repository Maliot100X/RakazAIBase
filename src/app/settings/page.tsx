import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Settings" };
export default function Page() {
  return <OperateTab title="Settings" purpose="Owner settings. Keys are managed outside the UI.">
<HonestCard title="Keys" body="Keys are never shown or edited here." />
<LinkRow href="/keyvault" label="Keyvault" hint="status" />
  </OperateTab>;
}
