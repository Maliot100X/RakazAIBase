"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MAX_FEE_ETH, MIN_FEE_ETH, PREVIEW_FEE_USD, QUOTE_TTL_MS, checkQuote, makeQuote, quoteAgeSec, type FeeQuote } from "@/lib/launch/service-fee";

/** Self-launch (user-signed wallet) — DRY-RUN preview. No wallet tx, no Clanker deploy. */
export function SelfLaunchPanel({ clankerReady, selfLaunchEnabled }: { clankerReady: boolean; selfLaunchEnabled: boolean }) {
  const [quote, setQuote] = useState<FeeQuote>(() => makeQuote({ usd: PREVIEW_FEE_USD, ethUsd: null, now: 0 }));
  const [now, setNow] = useState(0);
  const [wallet, setWallet] = useState<string | null>(null);
  const [src, setSrc] = useState("local");
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/v1/service-fee/quote", { cache: "no-store" });
      const d = await r.json();
      if (r.ok && d?.ok && d.quote) { setQuote(d.quote as FeeQuote); setSrc(String(d.ethUsdSource ?? "server")); return; }
    } catch { /* fall back */ }
    setQuote(makeQuote({ usd: PREVIEW_FEE_USD, ethUsd: null })); setSrc("local");
  }, []);
  useEffect(() => { const n = Date.now(); setNow(n); setQuote(makeQuote({ usd: PREVIEW_FEE_USD, ethUsd: null, now: n })); void refresh(); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [refresh]);
  const check = useMemo(() => checkQuote(quote, now), [quote, now]);
  const age = quoteAgeSec(quote.at, now);
  const ttl = Math.floor(QUOTE_TTL_MS / 1000);
  const canLaunch = clankerReady && selfLaunchEnabled && !!wallet && check.ok;
  const label = !clankerReady ? "idle · awaiting Clanker key" : !selfLaunchEnabled ? "idle · self-launch off" : !wallet ? "Connect wallet first" : !check.ok ? check.error : "Launch (dry-run)";
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between rounded-xl border-2 border-rk-ink bg-card px-3 py-2">
        <span>Wallet · Base 8453</span>
        <button type="button" className="rk-btn-honey min-h-9 px-3 text-xs" onClick={() => setWallet(wallet ? null : "0x0000…preview")}>
          {wallet ? `${wallet} · disconnect` : "Connect (stub)"}
        </button>
      </div>
      <div className="rounded-xl border-2 border-rk-ink bg-card px-3 py-2 space-y-1">
        <div className="flex justify-between"><span>Service fee <em className="opacity-60">(preview)</em></span><b>{quote.eth} ETH</b></div>
        <div className="flex justify-between opacity-70"><span>≈ ${quote.usd} · {quote.source}{quote.ethUsd ? ` @ $${quote.ethUsd}` : ""} · {src}</span><span>range {MIN_FEE_ETH}–{MAX_FEE_ETH} ETH</span></div>
        <div className="flex justify-between">
          <span className={check.ok ? "text-green-700" : "text-red-700"}>{check.ok ? `Fresh · ${age}s / ${ttl}s` : check.error}</span>
          <button type="button" className="underline text-xs" onClick={() => void refresh()}>Refresh quote</button>
        </div>
      </div>
      <button type="button" disabled={!canLaunch} className="rk-btn-honey w-full justify-center disabled:opacity-60" aria-disabled={!canLaunch}>{label}</button>
      <p className="text-xs opacity-60">Dry-run only. Nothing is signed or sent; Bankr stays primary.</p>
    </div>
  );
}
