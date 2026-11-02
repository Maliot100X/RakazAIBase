import { SiteTab, HonestCard, HoneyCta } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Studio help" };
export default function Page() {
  return <SiteTab title="Studio help" purpose="How to build an agent.">
<LinkRow href="/docs" label="Read docs" hint="read" />
  </SiteTab>;
}
