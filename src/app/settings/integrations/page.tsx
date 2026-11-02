import { Suspense } from "react";
import { connection } from "next/server";
import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard } from "@/components/dash/cards";
import { integrationsHealth } from "@/lib/env";
export const metadata = { title: "Integrations" };
const tone = (v: string) => (v === "configured" || v === "signed" || v === "enabled" ? "ok" : "pending") as "ok" | "pending";
async function Body() {
  await connection();
  const h = integrationsHealth() as Record<string, string>;
  return (<Col>
    <PageHead kicker="SETTINGS · BASE" title="Integrations" purpose="What is configured on this server. Status only — secret values are never shown." chip={<Chip tone="info">Base · 8453</Chip>} />
    <DashCard title="Status">
      <ul className="space-y-2 text-sm">
        {Object.entries(h).map(([k, v]) => (<li key={k} className="flex items-center justify-between gap-2"><span className="font-mono text-xs">{k}</span><Chip tone={tone(v)}>{v}</Chip></li>))}
        <li className="flex items-center justify-between gap-2"><span className="font-mono text-xs">clanker deploy</span><Chip tone="pending">idle (prepare-only)</Chip></li>
      </ul>
    </DashCard>
  </Col>);
}
export default function IntegrationsPage() { return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body /></Suspense>; }
