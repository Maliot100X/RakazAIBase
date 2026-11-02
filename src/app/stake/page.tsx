import { SiteTab, HonestCard, HoneyCta, MonoTable } from "@/components/tabs/kit";
export const metadata = { title: "Stake" };
export default function Page() {
  return <SiteTab title="Stake" purpose="Staking on Base. Not live — no contract deployed.">
<HonestCard title="Stake" body="Staking HOLD: no contract, no spend. Nothing to deposit." />
  </SiteTab>;
}
