import { SiteTab, HonestCard, HoneyCta } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Studio explore" };
export default function Page() {
  return <SiteTab title="Studio explore" purpose="Browse agents built here.">
<LinkRow href="/agents" label="All agents" hint="open" />
  </SiteTab>;
}
