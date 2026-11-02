import type { ReactNode } from "react";
import { PageEnter } from "./page-enter";

export type Tone = "ok" | "pending" | "failed" | "info";
export function Chip({ tone, children }: { tone?: Tone; children: ReactNode }) {
  return <span className="rk-chip" data-tone={tone}>{children}</span>;
}

export function PageHead({ kicker = "BASE · 8453", title, purpose, chip }: { kicker?: string; title: string; purpose: ReactNode; chip?: ReactNode }) {
  return (
    <PageEnter as="section" className="mb-6 space-y-3">
      <p className="rk-kicker text-rk-honey">{kicker}</p>
      <h1 className="rk-display">{title}</h1>
      <p className="max-w-prose text-muted-foreground">{purpose}</p>
      {chip && <div className="flex flex-wrap gap-2">{chip}</div>}
    </PageEnter>
  );
}

export function SkeletonCard() {
  return (
    <div className="rk-card-hard flex h-[120px] gap-3 p-4" aria-hidden>
      <div className="rk-skel size-11 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="rk-skel h-4 w-1/2" />
        <div className="rk-skel h-3 w-full" />
        <div className="grid grid-cols-3 gap-2 pt-1"><div className="rk-skel h-6" /><div className="rk-skel h-6" /><div className="rk-skel h-6" /></div>
      </div>
    </div>
  );
}

export function EmptyCard({ children }: { children: ReactNode }) {
  return <div className="rk-card-hard p-5 text-muted-foreground">{children}</div>;
}
