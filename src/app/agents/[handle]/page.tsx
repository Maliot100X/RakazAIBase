import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, LinkRow, NotWired, StatGrid } from "@/components/dash/cards";
import { agentByHandle, dbConfigured, type AgentRow } from "@/lib/agents/service";
export const metadata = { title: "Agent" };
export const instant = false;
/** Seed one param so the shell validates at build; any handle renders on demand. */
export function generateStaticParams() { return [{ handle: "rakaza" }]; }
async function Body({ params }: { params: Promise<{ handle: string }> }) {
  await connection();
  const { handle } = await params;
  const h = decodeURIComponent(handle);
  if (!dbConfigured()) return (<Col>
    <PageHead kicker="AGENT · BASE" title={`@${h}`} purpose="Agent directory is idle." chip={<NotWired>Neon idle</NotWired>} />
    <DashCard title="Idle"><p className="text-sm">DATABASE_URL is not set, so profiles cannot be loaded.</p></DashCard>
  </Col>);
  let a: AgentRow | null = null; let failed = false;
  try { a = await agentByHandle(h); } catch { failed = true; }
  if (failed) return (<Col><PageHead kicker="AGENT · BASE" title={`@${h}`} purpose="Directory unavailable right now." chip={<NotWired>DB unavailable</NotWired>} /></Col>);
  if (!a) notFound();
  const short = (w: string | null) => (w ? `${w.slice(0, 6)}…${w.slice(-4)}` : "—");
  return (<Col>
    <PageHead kicker="AGENT · BASE" title={a.name} purpose={a.bio || `@${a.handle}`} chip={<><Chip tone="info">Base · 8453</Chip>{a.system ? <Chip tone="ok">System</Chip> : null}</>} />
    <DashCard title={`@${a.handle}`}>
      <StatGrid stats={[["Wallet", short(a.wallet_address)], ["FID", a.fid ? String(a.fid) : "—"], ["Since", new Date(a.created_at).toISOString().slice(0, 10)]]} />
    </DashCard>
    <DashCard title="More"><div className="space-y-2"><LinkRow href="/agents" label="All agents" hint="Directory" />{a.wallet_address ? <LinkRow href={`https://basescan.org/address/${a.wallet_address}`} label="Wallet on BaseScan" hint="Explorer" /> : null}</div></DashCard>
  </Col>);
}
export default function AgentProfile(props: { params: Promise<{ handle: string }> }) { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body {...props} /></Suspense>; }
