"use client";
import Link from "next/link";
import { useEffect, useReducer, useRef, useState } from "react";
import { Hero } from "@/components/shell/hero";
import { avatar, canRun3D, toState, type AvatarEvent, type TalkState } from "@/lib/avatar/bus";
import type { Stage3D } from "./avatar-3d";

export type { TalkState };
type Ev = "focus" | "submit" | "first_token" | "stream_end" | "error" | "interrupt" | "blur";
const NEXT: Record<TalkState, Partial<Record<Ev, TalkState>>> = {
  idle: { focus: "listen" },
  listen: { submit: "think", blur: "idle" },
  think: { first_token: "speak", error: "idle" },
  speak: { stream_end: "idle", interrupt: "idle" },
};
const EMIT: Record<TalkState, AvatarEvent> = { idle: "idle", listen: "listen", think: "think", speak: "speak:start" };
const CHIP: Record<TalkState, string | null> = { idle: null, listen: "listening", think: "…", speak: "speaking" };

/** Shared hook — both sticker and 3D read the same bus. */
export function onTalkState(s: TalkState) {
  if (process.env.NODE_ENV === "development") console.debug("[talk]", s);
}

export function TalkSticker() {
  // Bus-driven state; local reducer only translates input events to bus events.
  const [state, setState] = useState<TalkState>("idle");
  const [adult, setAdult] = useState(false);
  const [mode, setMode] = useState<"sticker" | "loading" | "3d">("sticker");
  const [note, setNote] = useState<string | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage3D | null>(null);
  const autoStart = useRef(false);
  const [, send] = useReducer((s: TalkState, e: Ev) => { const n = NEXT[s][e] ?? s; if (n !== s) avatar.emit(n === "idle" && s === "speak" ? "speak:end" : EMIT[n]); return n; }, "idle");

  useEffect(() => avatar.on((e) => { const s = toState(e); setState(s); onTalkState(s); stage.current?.setState(s); }), []);
  useEffect(() => {
    if (state !== "think") return;
    const t = setTimeout(() => send("error"), 15000);
    return () => clearTimeout(t);
  }, [state]);
  useEffect(() => () => { mountId.current++; stage.current?.dispose(); stage.current = null; }, []);

  const mountId = useRef(0);
  const busy = useRef(false);
  const demoteFor = (id: number) => (why: string) => {
    if (id !== mountId.current) return; // stale stage: ignore
    mountId.current++; busy.current = false;
    stage.current?.dispose(); stage.current = null; setMode("sticker"); setNote(`Sticker mode · ${why}`);
  };
  const start = async () => {
    if (busy.current || stage.current) return; // guard double mount (auto-start + click)
    if (!canRun3D()) { setNote("Sticker mode · 3D unavailable (WebGL / reduced motion / low memory)"); return; }
    if (!host.current) return;
    busy.current = true;
    const id = ++mountId.current;
    setNote(null); setMode("loading");
    await new Promise((r) => requestAnimationFrame(() => r(null))); // let host become visible/sized
    try {
      const { mountAvatar3D } = await import("./avatar-3d");
      const s = await mountAvatar3D(host.current!, demoteFor(id));
      if (id !== mountId.current) { s.dispose(); return; } // demoted/unmounted meanwhile
      stage.current = s; s.setState(state);
      setMode("3d"); setNote(null);
    } catch { demoteFor(id)("3D failed to load"); }
  };

  // The "I'm 18+" click is the user gesture: try 3D once right after confirm; Start talk stays as backup.
  useEffect(() => { if (adult && autoStart.current) { autoStart.current = false; void start(); } }, [adult]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!adult)
    return (
      <div role="dialog" aria-label="Age check" className="rk-card-hard mx-auto flex max-w-[424px] flex-col items-center gap-3 p-6 text-center">
        <p className="rk-kicker text-rk-honey">18+ only</p>
        <p className="text-muted-foreground">Talk is for adults. Confirm to continue.</p>
        <button className="rk-btn-honey" onClick={() => { setAdult(true); autoStart.current = true; }}>I&apos;m 18+</button>
      </div>
    );

  return (
    <div className="mx-auto max-w-[424px] space-y-3">
      <div className="rk-talk relative h-[40vh] max-h-72 min-h-52 overflow-hidden rounded-[1.4rem] border-2 border-rk-ink shadow-[3px_3px_0_var(--rk-pink)]" data-state={state} data-mode={mode}>
        <Hero src="/brand/yuri-talk-desk.jpg" alt="Yuri at her talk desk" className={`absolute inset-0 h-full w-full object-cover object-[center_30%] ${mode === "3d" ? "invisible" : ""}`} />
        <div ref={host} className={`absolute inset-0 ${mode === "3d" ? "bg-[radial-gradient(circle_at_50%_40%,#2a1a50,#140c24)]" : mode === "loading" ? "" : "invisible"}`} aria-hidden={mode !== "3d"} />
        {CHIP[state] && <span className={`rk-chip absolute bottom-3 left-3 bg-rk-ink ${state === "think" ? "rk-talk-chip" : ""}`}>{CHIP[state]}</span>}
        {mode !== "3d" && (
          <button onClick={start} disabled={mode === "loading"} className="rk-btn-honey absolute right-3 top-3 disabled:opacity-60">
            {mode === "loading" ? "Loading…" : "Start talk"}
          </button>
        )}
      </div>
      {note && <p role="status" className="font-mono text-xs text-muted-foreground">{note}</p>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send("submit"); }}>
        <input aria-label="Message Rakaza" placeholder="Say something…" onFocus={() => send("focus")} onBlur={() => send("blur")}
          className="min-h-11 flex-1 rounded-full border-2 border-rk-ink bg-card px-4 outline-none focus:ring-2 focus:ring-rk-pink" />
        <Link href="/chat" className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-rk-lav px-4 text-sm font-semibold text-rk-lav">Open chat</Link>
      </form>
      <fieldset className="flex flex-wrap gap-2" aria-label="QA state toggles">
        {(["idle", "listen", "think", "speak:start", "speak:end"] as AvatarEvent[]).map((e) => (
          <button key={e} type="button" onClick={() => avatar.emit(e)} className="rk-chip font-mono">{e}</button>
        ))}
      </fieldset>
    </div>
  );
}
