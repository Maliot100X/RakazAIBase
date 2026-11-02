import { Chip, PageHead } from "@/components/shell/page-head";
import { Hero } from "@/components/shell/hero";
import { Col, DashCard, LinkRow, StatGrid } from "@/components/dash/cards";
export const metadata = { title: "Games" };
export default function GamesPage() {
  return (<Col>
    <PageHead title="Games" purpose="Ride ’Em with me. Leaderboard lives here too." chip={<Chip tone="ok">Ride ’Em live</Chip>} />
    <Hero src="/brand/rakaza-ride-em.jpg" alt="Rakaza riding in Ride ’Em" className="h-44 w-full object-cover" />
    <DashCard title="RIDE ’EM" chip={<Chip tone="ok">Playable</Chip>}>
      <StatGrid stats={[["Mode", "Local"], ["Chain", "Base"], ["Spend", "None"]]} />
      <div className="mt-3 space-y-2"><LinkRow href="/games/ride-em" label="Play Ride ’Em" hint="Tap to flap" /></div>
    </DashCard>
    <DashCard title="Leaderboard"><div className="space-y-2"><LinkRow href="/leaderboard" label="Open leaderboard" hint="Ranks" /></div></DashCard>
  </Col>);
}
