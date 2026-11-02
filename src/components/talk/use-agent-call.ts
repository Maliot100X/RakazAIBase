"use client";
import { useCallback, useRef, useState } from "react";
import { attachPcmBus, getSharedCtx, stopAudio, unlockAudio } from "@/lib/stage/audio-bus";
import { yuriAgentSettings } from "@/lib/voice/agent-settings";

export type CallStatus = "idle" | "connecting" | "listening" | "speaking" | "error";

function getMic(timeoutMs = 5000): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return Promise.resolve(null);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), timeoutMs);
    navigator.mediaDevices
      .getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      .then((s) => {
        clearTimeout(t);
        resolve(s);
      })
      .catch(() => {
        clearTimeout(t);
        resolve(null);
      });
  });
}

/** Mic → Deepgram Voice Agent (WS, short-lived token via Sec-WebSocket-Protocol) → Helena via shared AudioContext. */
export function useAgentCall(opts: { onText?: (role: string, text: string) => void; onSpeak?: (on: boolean) => void } = {}) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [err, setErr] = useState<string | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const r = useRef<{
    ws?: WebSocket;
    stream?: MediaStream;
    proc?: ScriptProcessorNode;
    src?: MediaStreamAudioSourceNode;
    nextAt: number;
    sources: Set<AudioBufferSourceNode>;
    alive: boolean;
    speaking?: boolean;
    endT?: ReturnType<typeof setTimeout>;
    micOn?: boolean;
    micT?: ReturnType<typeof setTimeout>;
    ka?: ReturnType<typeof setInterval>;
    drop?: boolean;
  }>({ nextAt: 0, sources: new Set(), alive: false });

  const hangUp = useCallback((opts?: { keepError?: boolean }) => {
    const s = r.current;
    s.alive = false;
    try {
      s.ws?.close();
    } catch {}
    s.proc?.disconnect();
    s.src?.disconnect();
    s.stream?.getTracks().forEach((t) => t.stop());
    s.sources.forEach((n) => {
      try {
        n.stop();
      } catch {}
    });
    s.sources.clear();
    if (s.endT) clearTimeout(s.endT);
    if (s.micT) clearTimeout(s.micT);
    if (s.ka) clearInterval(s.ka);
    stopAudio();
    r.current = { nextAt: 0, sources: new Set(), alive: false };
    optsRef.current.onSpeak?.(false);
    if (!opts?.keepError) {
      setErr(null);
      setStatus("idle");
    }
  }, []);

  const call = useCallback(async () => {
    unlockAudio();
    const ctx = getSharedCtx();
    void ctx.resume?.();
    setErr(null);
    setStatus("connecting");
    r.current.alive = true;
    try {
      // Token first — never block the agent handshake on mic permission.
      const tokRes = await fetch("/api/voice/agent-token", { method: "POST" });
      if (!tokRes.ok) throw new Error(`token ${tokRes.status}`);
      const tok = (await tokRes.json()) as { token: string; wsUrl: string };
      if (!r.current.alive) return;

      const micPromise = getMic(6000);

      const ws = new WebSocket(tok.wsUrl, ["token", tok.token]);
      ws.binaryType = "arraybuffer";
      r.current.ws = ws;
      const inRate = ctx.sampleRate || 48000;
      const speakOn = () => {
        if (r.current.endT) { clearTimeout(r.current.endT); r.current.endT = undefined; }
        if (r.current.speaking) return;
        r.current.speaking = true;
        setStatus("speaking");
        optsRef.current.onSpeak?.(true);
      };
      const speakOff = (afterMs = 0) => {
        if (r.current.endT) clearTimeout(r.current.endT);
        r.current.endT = setTimeout(() => {
          r.current.endT = undefined;
          if (!r.current.alive || !r.current.speaking) return;
          r.current.speaking = false;
          setStatus("listening");
          optsRef.current.onSpeak?.(false);
        }, Math.max(0, afterMs));
      };

      ws.onopen = () => {
        /* Welcome arrives as first message; do not send Settings yet */
      };

      let micStarted = false;
      const startMic = async () => {
        if (micStarted) return;
        micStarted = true;
        if (r.current.micT) { clearTimeout(r.current.micT); r.current.micT = undefined; }
        const stream = await micPromise;
        if (!r.current.alive || ws.readyState !== WebSocket.OPEN) return;
        if (!stream) {
          setErr("mic unavailable — you can still hear Yuri");
          return;
        }
        r.current.stream = stream;
        const src = ctx.createMediaStreamSource(stream);
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        proc.onaudioprocess = (ev) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const f = ev.inputBuffer.getChannelData(0);
          const out = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) out[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
          ws.send(out.buffer);
        };
        const mute = ctx.createGain();
        mute.gain.value = 0;
        src.connect(proc);
        proc.connect(mute);
        mute.connect(ctx.destination);
        r.current.src = src;
        r.current.proc = proc;
        r.current.micOn = true;
      };

      // Serialize binary decoding so Blob→ArrayBuffer awaits never reorder audio chunks.
      let binQ: Promise<void> = Promise.resolve();
      ws.onmessage = (e) => {
        if (!r.current.alive) return;
        if (typeof e.data !== "string") {
          const data = e.data as ArrayBuffer | Blob;
          binQ = binQ.then(async () => {
          const ab = data instanceof Blob ? await data.arrayBuffer() : data;
          if (!r.current.alive || r.current.drop) return; // barge-in: discard the interrupted reply's tail
          const pcm = new Int16Array(ab, 0, Math.floor(ab.byteLength / 2));
          if (!pcm.length) return;
          const buf = ctx.createBuffer(1, pcm.length, 24000);
          const ch = buf.getChannelData(0);
          for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;
          const n = ctx.createBufferSource();
          n.buffer = buf;
          n.connect(attachPcmBus()); // Gain → Analyser → destination: drives lipsync
          speakOn();
          const at = Math.max(ctx.currentTime, r.current.nextAt);
          n.start(at);
          r.current.nextAt = at + buf.duration;
          r.current.sources.add(n);
          n.onended = () => r.current.sources.delete(n);
          }).catch(() => {});
          return;
        }
        let m: { type?: string; role?: string; content?: string; description?: string };
        try {
          m = JSON.parse(e.data);
        } catch {
          return;
        }
        if (m.type === "Welcome") {
          ws.send(JSON.stringify(yuriAgentSettings(inRate)));
        } else if (m.type === "SettingsApplied") {
          setStatus("listening");
          // Keep socket alive while the mic is deferred (Deepgram drops idle sockets ~10s).
          r.current.ka = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN && !r.current.micOn) ws.send(JSON.stringify({ type: "KeepAlive" }));
          }, 4000);
          // Defer mic until greeting finished (AgentAudioDone), fallback 1.5s if no greeting audio starts.
          r.current.micT = setTimeout(() => {
            if (!r.current.speaking) void startMic();
          }, 1500);
        } else if (m.type === "ConversationText" && m.role && m.content) {
          optsRef.current.onText?.(m.role, m.content);
          if (m.role === "assistant") speakOn();
        } else if (m.type === "AgentStartedSpeaking") {
          r.current.drop = false;
          speakOn();
        } else if (m.type === "AgentAudioDone") {
          // Audio is queued ahead; end speak when playback actually finishes.
          const left = (r.current.nextAt - ctx.currentTime) * 1000;
          speakOff(left + 150);
          if (!micStarted) setTimeout(() => void startMic(), Math.max(0, left) + 200);
        } else if (m.type === "UserStartedSpeaking") {
          if (!r.current.micOn) return; // never barge-in before our mic streams
          r.current.drop = true;
          speakOff(0);
          r.current.sources.forEach((n) => {
            try {
              n.stop();
            } catch {}
          });
          r.current.sources.clear();
          r.current.nextAt = 0;
        } else if (m.type === "Error") {
          setErr(m.description ?? "agent error");
          setStatus("error");
        }
      };

      ws.onerror = () => {
        if (!r.current.alive) return;
        setErr("connection failed");
        setStatus("error");
      };
      ws.onclose = (ev) => {
        if (!r.current.alive) return;
        if (ev.code !== 1000 && ev.code !== 1005) {
          setErr(`call closed (${ev.code}${ev.reason ? `: ${ev.reason}` : ""})`);
          setStatus("error");
          hangUp({ keepError: true });
        } else {
          hangUp();
        }
      };
    } catch (e) {
      setErr(e instanceof Error ? e.message : "call failed");
      hangUp({ keepError: true });
      setStatus("error");
    }
  }, [hangUp]);

  return { status, err, call, hangUp, active: status === "connecting" || status === "listening" || status === "speaking" };
}
