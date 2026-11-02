import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Vanity" };
export default function Page() {
  return <OperateTab title="Vanity" purpose="Vanity EVM address generator.">
<HonestCard title="Generator" body="Not wired. Keys would never leave the device; nothing generated server-side." />
  </OperateTab>;
}
