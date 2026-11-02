"use client";
/**
 * Talk brain (text-first, 424×695): Send → think → /api/chat stream → [emo] → TTS → analyser mouth → idle.
 * One bus (@/lib/avatar/bus) drives both skins: CharacterStage (lite bust VRM) or the sticker fallback.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, SendHorizontal, Volume2, VolumeX } from "lucide-react";
import { useAgentCall } from "./use-agent-call";
import { Hero } from "@/components/shell/hero";
import { CharacterStage } from "@/components/stage/character-stage";
import { AdultToggle } from "@/components/stage/adult-toggle";
import { avatar, canRun3D, pickEmote, toState, type TalkState } from "@/lib/avatar/bus";
import { isAdultMode } from "@/lib/stage/motion-bus";
import { useVoice } from "./use-voice";
import { unlockAudio } from "@/lib/stage/audio-bus";

type Msg = { id: string; role: "user" | "assistant"; text: string };
const CHIP: Record<TalkState, string | null> = { idle: null, listen: "listening", think: "thinking…", speak: "speaking" };
const uid = () => Math.random().toString(36).slice(2, 10);

/** Read an AI SDK UI-message SSE stream; calls onDelta with each text delta. */
async function readStream(res: Response, onDelta: (d: string) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const j = JSON.parse(data) as { type?: string; delta?: string; errorText?: string };
        if (j.type === "text-delta" && j.delta) onDelta(j.delta);
        else if (j.type === "error") throw new Error(j.errorText || "stream error");
      } catch (e) { if (e instanceof Error && e.message !== "stream error" && !(e instanceof SyntaxError)) throw e; }
    }
  }
}

export function TalkClient() {
  const [adult, setAdult] = useState(false);
  const [three, setThree] = useState<boolean | null>(null);
  const [state, setState] = useState<TalkState>("idle");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const voice = useVoice({ muted, onStart: () => avatar.emit("speak:start"), onEnd: () => avatar.emit("speak:end") });
  const agentCall = useAgentCall({
    onText: (role, text) => setMsgs((m) => [...m, { id: `call-${Date.now()}-${m.length}`, role: role === "user" ? "user" : "assistant", text } as Msg]),
    onSpeak: (on) => avatar.emit(on ? "speak:start" : "speak:end"),
  });
  useEffect(() => () => agentCall.hangUp(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setThree(canRun3D()); }, []);
  useEffect(() => avatar.on((e) => setState(toState(e))), []);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [msgs]);
  useEffect(() => () => { abort.current?.abort(); avatar.emit("idle"); }, []);
  // never a frozen think: 45 s guard
  useEffect(() => {
    if (state !== "think") return;
    const t = setTimeout(() => { abort.current?.abort(); avatar.emit("idle"); setNote("Brain took too long. Try again."); }, 45000);
    return () => clearTimeout(t);
  }, [state]);
  const onStage = useCallback((s: "loading" | "ready" | "fallback") => { if (s === "fallback") setNote("2D mode · 3D failed to load"); }, []);

  async function send(text: string) {
    unlockAudio(); // gesture still fresh: unlock before any await
    const t = text.trim();
    if (!t) return;
    voice.stopSpeaking(); // interrupt mid-speech cleanly
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setNote(null);
    setInput("");
    const user: Msg = { id: uid(), role: "user", text: t };
    const bot: Msg = { id: uid(), role: "assistant", text: "" };
    const history = [...msgs, user];
    setMsgs([...history, bot]);
    avatar.emit("think");
    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST", signal: ac.signal, headers: { "content-type": "application/json" },
        body: JSON.stringify({ adult: isAdultMode(), messages: history.slice(-12).map((m) => ({ id: m.id, role: m.role, parts: [{ type: "text", text: m.text }] })) }),
      });
      if (res.status === 503) throw new Error("Brain is idle (not configured). Rakaza is resting.");
      if (res.status === 429) throw new Error("Slow down a little.");
      if (!res.ok || !res.body) throw new Error("My brain didn't answer. Try again.");
      await readStream(res, (d) => {
        full += d;
        const shown = full.replace(/^\s*\[emo:[a-z]*\]?\s*/i, "");
        setMsgs((m) => m.map((x) => (x.id === bot.id ? { ...x, text: shown } : x)));
      });
    } catch (e) {
      if (ac.signal.aborted) return;
      setMsgs((m) => m.filter((x) => x.id !== bot.id || x.text));
      setNote(e instanceof Error ? e.message : "Something went wrong.");
      avatar.emit("idle");
      return;
    }
    if (ac.signal.aborted) return;
    const { emote, text: clean } = pickEmote(full);
    setMsgs((m) => m.map((x) => (x.id === bot.id ? { ...x, text: clean } : x)));
    if (emote) avatar.emit(`emote:${emote}`);
    if (!clean.trim()) return avatar.emit("idle");
    await voice.speak(clean);
    if (avatar.state === "think") avatar.emit("idle");
  }

  if (!adult)
    return (
      <div role="dialog" aria-label="Age check" className="rk-card-hard mx-auto flex max-w-[424px] flex-col items-center gap-3 p-6 text-center">
        <p className="rk-kicker text-rk-honey">18+ only</p>
        <p className="text-muted-foreground">Talk is for adults. Confirm to continue.</p>
        <button className="rk-btn-honey" onClick={() => { unlockAudio(); setAdult(true); }}>I&apos;m 18+</button>
      </div>
    );

  const chip = voice.mode === "silent" && state === "speak" ? "speaking (silent)" : CHIP[state];
  return (
    <div className="mx-auto flex max-w-[424px] flex-col gap-3" data-talk-state={state}>
      <div className={`relative h-[min(52vh,380px)] min-h-[280px] max-h-[380px] overflow-hidden rounded-[1.4rem] border-2 border-rk-lav bg-[#120828] transition-shadow duration-200 ${state === "speak" ? "shadow-[0_0_0_2px_var(--rk-pink),0_0_22px_rgba(255,95,168,.45)]" : ""}`} data-state={state}>
        {three ? <CharacterStage className="absolute inset-0" variant="panel" lite speaking={state === "speak"} onState={onStage} /> : (
          <Hero src="/brand/yuri-talk-desk.jpg" alt="Yuri at her talk desk" className="absolute inset-0 h-full w-full object-cover object-[center_30%]" />
        )}
        {chip && <span className="rk-chip absolute bottom-3 left-3 z-20 bg-rk-ink" aria-live="polite">{chip}</span>}
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1">
          <button type="button" className="rk-chip !px-2" onClick={() => { unlockAudio(); setMuted((m) => !m); voice.stopSpeaking(); }} aria-label={muted ? "Unmute voice" : "Mute voice"}>
            {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
          </button>
          <AdultToggle compact />
        </div>
      </div>
      {three && <p className="-mt-2 text-right font-mono text-[10px] text-muted-foreground" data-avatar-credit>Avatar: Yuri · Tomokaaaaaaaa (DDLC)</p>}
      {three === false && <p role="status" className="font-mono text-xs text-muted-foreground">Sticker mode · 3D unavailable (WebGL / reduced motion / low memory)</p>}
      {voice.needsTap && !muted && (
        <button type="button" className="rk-chip self-start bg-rk-pink" onClick={() => { voice.replay(); }} data-tap-to-hear>
          <Volume2 className="size-3.5" /> Tap to hear Yuri
        </button>
      )}
      <div className="flex items-center gap-2" data-agent-call={agentCall.status}>
        {agentCall.active ? (
          <button type="button" className="rk-btn-honey inline-flex items-center gap-1 bg-rk-pink" onClick={() => agentCall.hangUp()} aria-label="Hang up"><PhoneOff className="size-4" /> Hang up</button>
        ) : (
          <button type="button" className="rk-btn-honey inline-flex items-center gap-1" onClick={() => { unlockAudio(); voice.stopSpeaking(); void agentCall.call(); }} aria-label="Call Yuri"><Phone className="size-4" /> Call Yuri</button>
        )}
        {agentCall.status !== "idle" && <span className="rk-chip" aria-live="polite">{agentCall.status === "speaking" ? "SPEAKING" : agentCall.status === "listening" ? "listening…" : agentCall.status === "connecting" ? "connecting…" : `call error${agentCall.err ? `: ${agentCall.err}` : ""}`}</span>}
      </div>
      {note && <p role="status" className="rk-chip self-start" data-tone="pending">{note}</p>}
      <div ref={list} className="max-h-48 space-y-2 overflow-y-auto font-mono text-sm" aria-live="polite">
        {msgs.map((m) => (
          <p key={m.id} className={m.role === "user" ? "text-right text-muted-foreground" : "text-foreground"}>
            {m.role === "assistant" && !m.text ? "…" : m.text}
          </p>
        ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <input aria-label="Message Rakaza" placeholder="Say something…" value={input} onChange={(e) => setInput(e.target.value)}
          onFocus={() => avatar.state === "idle" && avatar.emit("listen")} onBlur={() => avatar.state === "listen" && avatar.emit("idle")}
          className="min-h-11 flex-1 rounded-full border-2 border-rk-ink bg-card px-4 outline-none focus:ring-2 focus:ring-rk-pink" />
        <button type="submit" className="rk-btn-honey inline-flex items-center gap-1" disabled={!input.trim()} aria-label="Send"><SendHorizontal className="size-4" /> Send</button>
      </form>
      <Link href="/chat" className="self-start text-xs font-semibold text-rk-lav underline">Open full chat</Link>
    </div>
  );
}
