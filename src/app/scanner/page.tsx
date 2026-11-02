import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Scanner" };
export default function Page() {
  return <OperateTab title="Scanner" purpose="Scan Base ERC-20 contracts and new launches.">
<HonestCard title="New launches" body="Launch indexer not wired to a scanner view."><MonoTable head={["Token","Address","Age"]} rows={[]} empty="No scans." /></HonestCard>
<LinkRow href="/launch" label="Launches" hint="open" />
  </OperateTab>;
}
