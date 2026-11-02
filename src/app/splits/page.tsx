import { DashCard, FeeBoard, Rows } from "@/components/fees/board";
import { CREATOR_BPS, TREASURY_BPS } from "@/lib/launch/sponsored-split";
import { uniswapIntegration } from "@/lib/launch/quote";
export const metadata = { title: "Splits" };
export default function Page() {
  return <FeeBoard title="Splits" purpose="Reward recipients rule — launcher / platform treasury.">
    <DashCard title="Rule"><Rows rows={[["Launcher", `${CREATOR_BPS} bps`], ["Platform treasury", `${TREASURY_BPS} bps`]]} empty="" /></DashCard>
    <DashCard title="Integrations"><Rows rows={[["Splits API", process.env.SPLITS_API_KEY ? "configured" : "idle"], ["Uniswap quote", uniswapIntegration.configured ? "ready" : "idle"], ["Clanker", "idle"]]} empty="" /></DashCard>
  </FeeBoard>;
}
