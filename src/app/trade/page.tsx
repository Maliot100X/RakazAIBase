import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Trade" };
export default function Page() {
  return <OperateTab title="Trade" purpose="Swaps on Base.">
<HonestCard title="Swap" body="Trading HOLD: EXECUTE disabled, no live spend." />
  </OperateTab>;
}
