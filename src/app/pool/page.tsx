import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Pool" };
export default function Page() {
  return <OperateTab title="Pool" purpose="Liquidity pools for Rakaza launches on Base.">
<HonestCard title="Pools" body="Pool reads not wired." />
<LinkRow href="/fees" label="Fee totals" hint="live board" />
  </OperateTab>;
}
