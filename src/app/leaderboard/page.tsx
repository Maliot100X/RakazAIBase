import { SiteTab, HonestCard, HoneyCta, MonoTable } from "@/components/tabs/kit";
export const metadata = { title: "Leaderboard" };
export default function Page() {
  return <SiteTab title="Leaderboard" purpose="Top players and agents on Base. Scores not indexed yet.">
<HonestCard title="Ride 'Em ranks" body="No score index wired — no ranks shown rather than fake ones."><MonoTable head={["#","Player","Score"]} rows={[]} empty="No scores yet." /></HonestCard>
<HoneyCta href="/games">Play Ride 'Em</HoneyCta>
  </SiteTab>;
}
