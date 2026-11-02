"use client";
import { useState } from "react";
import { CREATOR_BPS, TREASURY_BPS } from "@/lib/launch/sponsored-split";

const field = "min-h-11 w-full rounded-xl border-2 border-rk-ink bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-rk-pink";
/** Sponsored (platform/treasury) launch via Bankr: 70% creator / 30% treasury. Fee recipient is never prefilled. */
export function SponsoredPanel({ live, reason }: { live: boolean; reason: string | null }) {
  const [f, setF] = useState({ agentId: "", name: "", symbol: "", feeRecipient: "" });
  const [ticket, setTicket] = useState<{ token: string; id: string; dryRun: boolean } | null>(null);
  const [approve, setApprove] = useState(false);
  const [out, setOut] = useState("");
  const call = async (url: string, body?: unknown) => {
    const r = await fetch(url, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
    const j = await r.json().catch(() => ({})); setOut(JSON.stringify(j, null, 2)); return j as Record<string, unknown>;
  };
  const prepare = async () => { const j = await call("/api/v1/launch/sponsored/prepare", f); setApprove(false); setTicket(j.ok ? { token: String(j.ticket), id: String(j.id), dryRun: !!j.dryRun } : null); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between rounded-xl border-2 border-rk-ink bg-card px-3 py-2">
        <span>Creator fee wallet <b>70%</b> ({CREATOR_BPS} bps)</span><span>Treasury <b>30%</b> ({TREASURY_BPS} bps)</span>
      </div>
      <input className={field} placeholder="Agent ID" aria-label="Agent ID" value={f.agentId} onChange={set("agentId")} />
      <input className={field} placeholder="Token name" aria-label="Token name" value={f.name} onChange={set("name")} />
      <input className={field} placeholder="Ticker" aria-label="Ticker" value={f.symbol} onChange={set("symbol")} />
      <input className={field} placeholder="Fee-recipient wallet 0x… (70%) — not the treasury" aria-label="Fee-recipient wallet" autoComplete="off" value={f.feeRecipient} onChange={set("feeRecipient")} />
      <button type="button" className="rk-btn-honey w-full justify-center" onClick={prepare}>Prepare approval ticket</button>
      {ticket && (<>
        <label className="flex items-center gap-2"><input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} /> I approve this launch {ticket.dryRun ? "(dry-run)" : ""}</label>
        <div className="flex gap-2">
          <button type="button" disabled={!approve} className="rk-btn-honey flex-1 justify-center disabled:opacity-60" onClick={() => call("/api/v1/launch/sponsored/start", { ticket: ticket.token, approve })}>{live ? "Start (Bankr)" : "Start · idle"}</button>
          <button type="button" className="rk-btn-honey flex-1 justify-center" onClick={() => call(`/api/v1/launch/sponsored/status/${ticket.id}`)}>Status</button>
        </div>
      </>)}
      {out && <pre className="max-h-48 overflow-auto rounded-xl border-2 border-rk-ink bg-card p-2 text-xs">{out}</pre>}
      <p className="text-xs opacity-60">{live ? "Live: Bankr job after human approval." : `Idle (${reason}). Dry-run only — nothing is sent or spent.`}</p>
    </div>
  );
}
