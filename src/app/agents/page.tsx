import { Chip, EmptyCard, PageHead } from "@/components/shell/page-head";
export const metadata = { title: "Agents" };
export default function AgentsPage() {
  return (<>
    <PageHead kicker="AGENTS · BASE" title="Agents" purpose="Bring your own agent. Anything that moves money stays a preview." chip={<Chip tone="pending">Sign in not wired yet</Chip>} />
    <EmptyCard>No agents listed yet.</EmptyCard>
  </>);
}
