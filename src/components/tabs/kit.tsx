import type { ReactNode } from "react";
import Link from "next/link";
import { Chip, PageHead } from "@/components/shell/page-head";
import { Col, DashCard, LinkRow, NotWired } from "@/components/dash/cards";

/** Agent-shell site tab: PageEnter (via PageHead) only, sticker rows, one honey action max. */
export function SiteTab({ title, purpose, kicker, chips, children }: { title: string; purpose: string; kicker?: string; chips?: ReactNode; children: ReactNode }) {
  return <Col>
    <PageHead kicker={kicker} title={title} purpose={purpose} chip={<><Chip tone="info">Base · 8453</Chip><Chip tone="info">Farcaster</Chip>{chips}</>} />
    {children}
  </Col>;
}

/** Operate tab: CONTROL ROOM kicker + pink rule drawn once; dense; no dock/bob. */
export function OperateTab({ title, purpose, children }: { title: string; purpose: string; children: ReactNode }) {
  return <Col>
    <PageHead kicker="CONTROL ROOM · BASE 8453" title={title} purpose={purpose} chip={<NotWired>Dry-run</NotWired>} />
    <div className="rk-rule" aria-hidden />
    {children}
  </Col>;
}

/** Docs read mode: max-w-prose, no stagger/bob. */
export function DocsTab({ title, children }: { title: string; children: ReactNode }) {
  return <article className="mx-auto w-full max-w-[424px] space-y-4">
    <PageHead kicker="DOCS" title={title} purpose="Read mode. Machine-readable sources linked below." />
    <div className="max-w-prose space-y-3 text-sm leading-relaxed">{children}</div>
    <nav className="grid gap-2" aria-label="Docs">
      {[["Overview", "/docs"], ["Skill", "/docs/skill"], ["MCP", "/docs/mcp"], ["API", "/docs/api"]].map(([l, h]) => <LinkRow key={h} href={h} label={l} hint="read" />)}
    </nav>
  </article>;
}

export const Code = ({ children }: { children: ReactNode }) => <code className="rounded border-[1.5px] border-[var(--rk-lav,var(--rk-line))] px-1.5 py-0.5 font-mono text-xs">{children}</code>;

export function HonestCard({ title, body, wired = false, children }: { title: string; body: string; wired?: boolean; children?: ReactNode }) {
  return <DashCard title={title} chip={wired ? <Chip tone="ok">Live</Chip> : <NotWired />}>
    <p className="text-sm text-muted-foreground">{body}</p>{children}
  </DashCard>;
}

/** Horizontal-scroll mono table for 424px. */
export function MonoTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[360px] font-mono text-xs">
    <thead><tr>{head.map((h) => <th key={h} className="py-1 text-left text-muted-foreground">{h}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="py-1">{c}</td>)}</tr>) : <tr><td colSpan={head.length} className="py-2 text-muted-foreground">{empty}</td></tr>}</tbody>
  </table></div>;
}

export const HoneyCta = ({ href, children }: { href: string; children: ReactNode }) =>
  <Link href={href} className="flex bg-primary text-primary-foreground border-[1.5px] border-[var(--rk-line)] min-h-11 items-center justify-center rounded-xl px-4 font-bold">{children}</Link>;
