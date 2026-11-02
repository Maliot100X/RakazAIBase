import { SiteTab, HonestCard, HoneyCta, MonoTable } from "@/components/tabs/kit";
export const metadata = { title: "Memes" };
export default function Page() {
  return <SiteTab title="Memes" purpose="Community memes on Farcaster. Feed pending.">
<HonestCard title="Meme feed" body="Farcaster channel feed not wired." />
<HoneyCta href="/community">Open community</HoneyCta>
  </SiteTab>;
}
