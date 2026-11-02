import { SiteTab, HonestCard, HoneyCta } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Studio" };
export default function Page() {
  return <SiteTab title="Studio" purpose="Build and launch agents on Base.">
<LinkRow href="/studio/create" label="Create" hint="new agent" />
<LinkRow href="/studio/explore" label="Explore" hint="agents" />
<LinkRow href="/studio/me" label="My studio" hint="account" />
<LinkRow href="/studio/help" label="Help" hint="docs" />
  </SiteTab>;
}
