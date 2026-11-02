import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, LinkRow } from "@/components/dash/cards";
import { RideEmGame } from "@/components/games/ride-em";
export const metadata = { title: "Ride ’Em" };
export default function RideEmPage() {
  return (
    <Col>
      <PageHead kicker="GAMES · BASE" title="Ride ’Em" purpose="Flap through the canyon with Rakaza. Local high score in this browser — no wallet spend."
        chip={<><Chip tone="ok">Playable</Chip><Chip tone="info">Base Mini App</Chip></>} />
      <DashCard title="Ride ’Em"><RideEmGame /></DashCard>
      <DashCard title="More"><div className="space-y-2"><LinkRow href="/games" label="Games hub" hint="All games" /><LinkRow href="/leaderboard" label="Leaderboard" hint="Ranks" /></div></DashCard>
    </Col>
  );
}
