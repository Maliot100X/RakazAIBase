import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Chip } from "@/components/shell/page-head";
import { DashCard, NotWired, StatGrid } from "@/components/dash/cards";
import { SiteTab } from "@/components/tabs/kit";
import { BLOCK_EXPLORER, CHAIN_ID } from "@/lib/chain";
export const metadata = { title: "Token" };
/** Seed one param so the shell validates at build; any 0x address renders on demand. */
export function generateStaticParams() { return [{ address: "0x0000000000000000000000000000000000000000" }]; }
async function Body({ params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) notFound();
  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
  return <SiteTab kicker={`ERC-20 · CHAIN ${CHAIN_ID}`} title={short} purpose="Token detail on Base. Market data not wired." chips={<Chip tone="pending">Risk: unchecked</Chip>}>
    <DashCard title="Identity"><p className="break-all font-mono text-xs">{address}</p>
      <div className="mt-3 flex gap-2"><a className="flex min-h-11 flex-1 items-center justify-center rounded-lg border-[1.5px] border-[var(--rk-line)] text-sm font-semibold" href={`${BLOCK_EXPLORER}/token/${address}`} target="_blank" rel="noreferrer">Basescan ↗</a></div>
    </DashCard>
    <DashCard title="Market" chip={<NotWired />}><StatGrid stats={[["Price", "—"], ["Holders", "—"], ["Liquidity", "—"]]} /></DashCard>
    <DashCard title="Chart" chip={<NotWired />}><div className="rk-skel h-32 w-full rounded-lg" aria-label="Chart not wired" /></DashCard>
  </SiteTab>;
}
export default function Page(props: { params: Promise<{ address: string }> }) {
  return <Suspense fallback={<p className="p-4 text-sm opacity-70">Loading…</p>}><Body {...props} /></Suspense>;
}
