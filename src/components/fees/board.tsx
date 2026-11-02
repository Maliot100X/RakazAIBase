import type { ReactNode } from "react";
import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, NotWired } from "@/components/dash/cards";
export function FeeBoard({ title, purpose, children }: { title: string; purpose: string; children: ReactNode }) {
  return (<Col>
    <PageHead title={title} purpose={purpose} chip={<><Chip tone="info">Base · 8453</Chip><NotWired>Dry-run</NotWired></>} />
    {children}
  </Col>);
}
export function Rows({ rows, empty }: { rows: [string, string][]; empty: string }) {
  if (!rows.length) return <p className="text-sm opacity-70">{empty}</p>;
  return <ul className="space-y-1 font-mono text-xs">{rows.map(([a, b], i) => <li key={i} className="flex justify-between gap-2"><span className="truncate">{a}</span><span>{b}</span></li>)}</ul>;
}
export { DashCard };
