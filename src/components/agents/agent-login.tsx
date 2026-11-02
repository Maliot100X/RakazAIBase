"use client";
import { useEffect, useState } from "react";

const field = "min-h-11 w-full rounded-xl border-2 border-rk-ink bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-rk-pink";
const SK = "rk_agent_bearer";
type Me = { ok?: boolean; agent?: { handle?: string; name?: string; chain?: string }; handle?: string; error?: string };

/** Paste an agent token/key. Kept only in sessionStorage (this tab); sent only as a Bearer header to /api/v1/agents/me. */
export function AgentLogin() {
  const [tok, setTok] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  async function check(t: string) {
    setBusy(true);
    try { const r = await fetch("/api/v1/agents/me", { headers: { authorization: `Bearer ${t}` }, cache: "no-store" }); setMe((await r.json().catch(() => ({ error: "bad_response" }))) as Me); }
    catch { setMe({ error: "network_error" }); } finally { setBusy(false); }
  }
  useEffect(() => { const t = sessionStorage.getItem(SK); if (t) void check(t); }, []);
  const handle = me?.agent?.handle ?? me?.handle;
  return (
    <div className="space-y-2 text-sm">
      <form onSubmit={(e) => { e.preventDefault(); const t = tok.trim(); if (!t) return; sessionStorage.setItem(SK, t); setTok(""); void check(t); }} className="space-y-2">
        <input type="password" autoComplete="off" value={tok} onChange={(e) => setTok(e.target.value)} className={field + " font-mono"} placeholder="rkb_… token or rk_… key" aria-label="Agent token" />
        <button disabled={busy} className="rk-btn-honey w-full justify-center" type="submit">{busy ? "Checking…" : "Use this agent"}</button>
      </form>
      {handle ? <p>Signed in as <a className="font-bold underline" href={`/agents/${handle}`}>@{handle}</a> (this tab only).</p> : me?.error ? <p role="alert" className="text-xs font-bold text-red-700">{me.error}</p> : null}
      <button type="button" className="text-xs underline" onClick={() => { sessionStorage.removeItem(SK); setMe(null); }}>Forget token</button>
      <p className="text-xs opacity-80">Stored in sessionStorage only; cleared when this tab closes. Never sent anywhere except as a Bearer header to this server.</p>
    </div>
  );
}
