"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { attachElement, isAudioUnlocked, startDemo, stopAudio, unlockAudio } from "@/lib/stage/audio-bus";

/**
 * Speaking-only voice for Talk (ported from RakazaAiTerminal; STT / mic is phase 2).
 * TTS via /api/voice/tts → <audio> → analyser (real lip-sync). If TTS is unavailable (503/error) she
 * "speaks" silently: the demo signal drives the same analyser for ~chars×60 ms (sine-ish mouth). Never throws.
 */
export function useVoice(opts: { muted: boolean; onStart?: () => void; onEnd?: () => void }) {
  const [speaking, setSpeaking] = useState(false);
  const [mode, setMode] = useState<"voice" | "silent" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const live = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);
  const lastUrl = useRef<string | null>(null);
  const cb = useRef(opts);
  useEffect(() => { cb.current = opts; }, [opts]);

  const stopSpeaking = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    stopAudio();
    setSpeaking(false);
    if (live.current) { live.current = false; cb.current.onEnd?.(); }
  }, []);

  const begin = () => { live.current = true; setSpeaking(true); cb.current.onStart?.(); };
  const silent = (text: string) => {
    try { startDemo(); } catch { /* no AudioContext: chip only */ }
    setMode("silent");
    begin();
    timer.current = setTimeout(stopSpeaking, Math.min(12000, Math.max(900, text.length * 60)));
  };

  const speak = useCallback(async (text: string) => {
    stopSpeaking();
    setNeedsTap(false);
    if (!/[\p{L}\p{N}]/u.test(text)) return;
    if (cb.current.muted) return silent(text);
    if (!isAudioUnlocked()) unlockAudio();
    let url: string;
    try {
      const res = await fetch("/api/voice/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (!res.ok) throw new Error(`tts ${res.status}`);
      url = URL.createObjectURL(await res.blob());
    } catch {
      return silent(text);
    }
    if (lastUrl.current && lastUrl.current !== url) URL.revokeObjectURL(lastUrl.current);
    lastUrl.current = url;
    const play = async () => {
      const el = new Audio(url);
      audioRef.current = el;
      el.onended = () => stopSpeaking();
      el.onerror = () => stopSpeaking();
      el.volume = 1;
      try { attachElement(el); } catch { /* lip-sync optional; audio still plays */ }
      await el.play();
    };
    try {
      await play();
    } catch {
      unlockAudio();
      try { await play(); } catch {
        audioRef.current = null;
        setNeedsTap(true);
        return silent(text);
      }
    }
    setMode("voice");
    begin();
  }, [stopSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Replay the last TTS clip under a fresh user gesture ("Tap to hear"). */
  const replay = useCallback(() => {
    const url = lastUrl.current;
    if (!url) return;
    stopSpeaking();
    unlockAudio();
    const el = new Audio(url);
    audioRef.current = el;
    el.onended = () => stopSpeaking();
    el.onerror = () => stopSpeaking();
    el.volume = 1;
    try { attachElement(el); } catch { /* */ }
    el.play().then(() => {
      setNeedsTap(false); setMode("voice"); begin();
    }).catch(() => setNeedsTap(true));
  }, [stopSpeaking]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => stopSpeaking(), [stopSpeaking]);
  return { speaking, mode, speak, stopSpeaking, needsTap, replay };
}
