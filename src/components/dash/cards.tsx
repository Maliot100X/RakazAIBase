import type { ReactNode } from "react";
import Link from "next/link";
import { Chip } from "@/components/shell/page-head";

/** Mini App dashboard sticker card (424-wide column). */
export function DashCard({ title, chip, children, className = "" }: { title: string; chip?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rk-card-hard p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {chip}
      </div>
      {children}
    </section>
  );
}

export const NotWired = ({ children = "Not wired" }: { children?: ReactNode }) => <Chip tone="pending">{children}</Chip>;

/** Skeleton feed rows — honest placeholders, no fake chain data. */
export function SkelRows({ n = 3 }: { n?: number }) {
  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <li key={i} className="flex items-center gap-3">
          <div className="rk-skel size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5"><div className="rk-skel h-3 w-2/5" /><div className="rk-skel h-2.5 w-4/5" /></div>
          <div className="rk-skel h-5 w-12 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function Checklist({ items }: { items: [string, boolean][] }) {
  return (
    <ul className="space-y-1.5 font-mono text-xs">
      {items.map(([label, ok]) => (
        <li key={label} className="flex items-center justify-between gap-2">
          <span>{label}</span>
          <span className={ok ? "text-rk-mint" : "text-muted-foreground"}>{ok ? "● ready" : "○ pending"}</span>
        </li>
      ))}
    </ul>
  );
}

export function StatGrid({ stats }: { stats: [string, string][] }) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-center">
      {stats.map(([k, v]) => (
        <div key={k} className="rounded-lg border-[1.5px] border-[var(--rk-line)] p-2">
          <dt className="rk-kicker text-[0.6rem] text-muted-foreground">{k}</dt>
          <dd className="font-mono text-sm tabular-nums">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LinkRow({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center justify-between rounded-lg border-[1.5px] border-[var(--rk-line)] px-3 text-sm">
      <span className="font-semibold">{label}</span><span className="text-xs text-muted-foreground">{hint} →</span>
    </Link>
  );
}

export const Col = ({ children }: { children: ReactNode }) => <div className="mx-auto w-full max-w-[424px] space-y-4">{children}</div>;
