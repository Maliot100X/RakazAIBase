import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Lab" };
export default function Page() {
  return <OperateTab title="Lab" purpose="Experiments. Nothing runs live from here.">
<HonestCard title="Experiments" body="No experiments enabled." />
  </OperateTab>;
}
