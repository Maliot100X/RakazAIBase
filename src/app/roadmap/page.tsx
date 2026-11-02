import { SiteTab, HonestCard, HoneyCta, MonoTable } from "@/components/tabs/kit";
export const metadata = { title: "Roadmap" };
export default function Page() {
  return <SiteTab title="Roadmap" purpose="What ships next on Based Agents Terminal.">
<HonestCard wired title="Shipped" body="Agents, Talk, Launch (dry-run), Community, Games, Fees boards, Skill/MCP/API." />
<HonestCard title="Next" body="Live launches, leaderboard index, diary, staking — gated by owner." />
  </SiteTab>;
}
