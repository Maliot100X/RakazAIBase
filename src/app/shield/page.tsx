import { OperateTab, HonestCard, MonoTable } from "@/components/tabs/kit";
import { LinkRow } from "@/components/dash/cards";
export const metadata = { title: "Shield" };
export default function Page() {
  return <OperateTab title="Shield" purpose="Contract risk checks (honeypot, owner, tax) for Base tokens.">
<HonestCard title="Risk checks" body="No risk API wired. Checks will be read-only." />
  </OperateTab>;
}
