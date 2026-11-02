import { SiteTab, HonestCard, HoneyCta } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "My studio" };
export default function Page() {
  return <SiteTab title="My studio" purpose="Your agents and drafts.">
<HonestCard title="Account" body="Connect with Farcaster to see your agents." />
<LinkRow href="/agents/me" label="My agent" hint="open" />
  </SiteTab>;
}
