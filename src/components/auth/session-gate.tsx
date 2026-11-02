"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { ConnectButton } from "@/components/connect-button";

export type SessionInfo = { ok: boolean; role: string | null; fid?: number | null; address?: string | null; idle?: boolean };
const Ctx = createContext<SessionInfo | null>(null);
export const useSessionInfo = () => useContext(Ctx);

export function useSession() {
  const [s, setS] = useState<SessionInfo | null>(null);
  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/session", { credentials: "include", cache: "no-store" });
      setS((await r.json()) as SessionInfo);
    } catch { setS({ ok: false, role: null }); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void refresh(); }, [refresh]);
  return { session: s, refresh };
}

/** Sign-in panel: Farcaster Quick Auth (preferred) + wallet. Never a password form. */
export function SignInPanel({ onDone, title = "Sign in" }: { onDone?: () => void; title?: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fc = async () => {
    setBusy(true); setMsg(null);
    try {
      const { token } = await sdk.quickAuth.getToken();
      const r = await fetch("/api/auth/login", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "quickauth", token }) });
      if (!r.ok) throw new Error(r.status === 503 ? "Sign-in idle — server auth not configured." : "Farcaster sign-in was rejected.");
      onDone?.();
    } catch (e) {
      setMsg(e instanceof Error && /idle|rejected/.test(e.message) ? e.message : "Open inside a Farcaster client to use Quick Auth, or connect a wallet.");
    } finally { setBusy(false); }
  };
  return (
    <section className="mx-auto flex w-full max-w-[424px] flex-col gap-4 rounded-xl border-[1.5px] border-rk-lav/50 bg-card p-4 font-mono text-sm">
      <p className="rk-kicker text-rk-pink">CONTROL ROOM</p>
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-xs text-muted-foreground">Continue with your Farcaster account or a Base wallet.</p>
      <button className="rk-btn-honey justify-center" disabled={busy} onClick={fc}>{busy ? "Signing in…" : "Sign in with Farcaster"}</button>
      <div className="rk-rule" aria-hidden />
      <p className="rk-kicker text-muted-foreground">Wallet · Base 8453</p>
      <ConnectButton />
      {msg && <p role="status" className="text-xs text-rk-pink">{msg}</p>}
    </section>
  );
}

/** Client gate: FC Quick Auth / wallet session. Authenticated (fid | address | owner) sees children. */
export function SessionGate({ children }: { children: ReactNode }) {
  const { session, refresh } = useSession();
  if (!session) return <p className="font-mono text-xs text-muted-foreground">Checking session…</p>;
  const authed = session.ok && (session.role === "owner" || !!session.fid || !!session.address);
  if (!authed) return <SignInPanel onDone={refresh} title="Continue to dashboard" />;
  return <Ctx.Provider value={session}><div className="rk-rule mb-3" aria-hidden />{children}</Ctx.Provider>;
}
