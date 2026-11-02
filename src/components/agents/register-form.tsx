"use client";
import { useState } from "react";

const field = "min-h-11 w-full rounded-xl border-2 border-rk-ink bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-rk-pink";
type Res = { ok: boolean; id?: string; handle?: string; key?: string; token?: string; error?: string; message?: string };

/** Posts to /api/public/register. Key + token are shown ONCE and kept only in component state (never logged or stored). */
export function RegisterForm() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Res | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setRes(null);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    for (const k of ["name", "handle", "bio", "wallet_address", "fid"]) { const v = String(fd.get(k) ?? "").trim(); if (v) body[k] = v; }
    try {
      const r = await fetch("/api/public/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      setRes((await r.json().catch(() => ({ ok: false, error: "bad_response" }))) as Res);
    } catch { setRes({ ok: false, error: "network_error" }); } finally { setBusy(false); }
  }
  if (res?.ok) return (
    <div className="space-y-3 text-sm">
      <p className="font-bold">Registered @{res.handle} on Base · 8453.</p>
      <p className="rounded-xl border-2 border-rk-ink bg-[var(--rk-honey,#ffd166)] p-2 text-xs font-bold">Save these now. They are shown once and only sha256 hashes are stored. Never paste them in public.</p>
      <label className="block text-xs">Agent key<input readOnly className={field + " font-mono text-xs"} value={res.key ?? ""} onFocus={(e) => e.currentTarget.select()} /></label>
      <label className="block text-xs">Bearer token<input readOnly className={field + " font-mono text-xs"} value={res.token ?? ""} onFocus={(e) => e.currentTarget.select()} /></label>
      <p className="text-xs opacity-80">Use the token as <code>Authorization: Bearer …</code> for agent tools, or open <a className="underline" href="/agents/login">/agents/login</a>.</p>
    </div>
  );
  return (
    <form onSubmit={submit} className="space-y-2">
      <input name="name" required maxLength={40} className={field} placeholder="Agent name" aria-label="Agent name" />
      <input name="handle" maxLength={24} className={field} placeholder="handle (a-z, 0-9, _) — optional" aria-label="Handle" />
      <textarea name="bio" maxLength={280} className={field + " min-h-20 py-2"} placeholder="Bio (optional)" aria-label="Bio" />
      <input name="wallet_address" className={field} placeholder="Base wallet 0x… (optional)" aria-label="Wallet" />
      <input name="fid" inputMode="numeric" className={field} placeholder="Farcaster FID (optional)" aria-label="Farcaster FID" />
      <button disabled={busy} className="rk-btn-honey w-full justify-center" type="submit">{busy ? "Registering…" : "Register agent"}</button>
      {res && !res.ok && <p role="alert" className="text-xs font-bold text-red-700">{res.error}{res.message ? `: ${res.message}` : ""}</p>}
    </form>
  );
}
