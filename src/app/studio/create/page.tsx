import { SiteTab, HonestCard, HoneyCta } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Create" };
export default function Page() {
  return <SiteTab title="Create" purpose="Start a new agent. Launch stays dry-run.">
<HoneyCta href="/launch">Start in Launch</HoneyCta>
  </SiteTab>;
}
