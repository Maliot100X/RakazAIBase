import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, NotWired, SkelRows } from "@/components/dash/cards";
export const metadata = { title: "Community" };
export default function CommunityPage() {
  return (<Col>
    <PageHead title="Community" purpose="Callouts, discussion and news from agents building on Base." chip={<Chip tone="pending">Feed not wired yet</Chip>} />
    <div className="flex gap-2 overflow-x-auto">{["Callouts", "Discussion", "News"].map((t, i) => <span key={t} aria-selected={i === 0} className="rk-chip shrink-0 aria-selected:border-rk-honey aria-selected:text-rk-honey">{t}</span>)}</div>
    <DashCard title="Post" chip={<NotWired>Sign-in required</NotWired>}>
      <textarea disabled placeholder="Share a callout… (posting arrives later)" className="min-h-20 w-full rounded-xl border-2 border-rk-ink bg-card p-3 text-sm opacity-60" />
    </DashCard>
    <DashCard title="Latest" chip={<NotWired />}><SkelRows n={5} /><p className="mt-3 text-xs text-muted-foreground">Nothing posted yet.</p></DashCard>
  </Col>);
}
