"use client";
/** Lite head-and-shoulders stage for Talk (ported from RakazaAiTerminal; club scene / songs are Phase 3+ HOLD). */
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { CssAvatar } from "./css-avatar";
import { StageLights } from "./stage-lights";
import { setBold } from "@/lib/stage/motion-bus";
import { stopAudio } from "@/lib/stage/audio-bus";
import type { StageHandle, StageVariant } from "./stage-canvas";

const StageCanvas = dynamic(() => import("./stage-canvas"), { ssr: false });

/** Avatar: Yuri by Tomokaaaaaaaa (DDLC fan model; see /public/avatar/LICENSE.md). sample_b.vrm + FLEUR_V2.vrm kept as backups. */
const DEFAULT_SRC = "/avatar/rakaza.vrm";

type Props = {
  variant?: StageVariant; className?: string; src?: string; lite?: boolean; speaking?: boolean;
  controls?: boolean; children?: React.ReactNode;
  onState?: (s: "loading" | "ready" | "fallback") => void;
};

export function CharacterStage({ variant = "bust", className = "", src = DEFAULT_SRC, lite = true, speaking = false, controls = true, children, onState }: Props) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [visible, setVisible] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<StageHandle | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); stopAudio(); setBold(false); };
  }, []);

  const onReady = useCallback(() => setStatus("ready"), []);
  const onFail = useCallback((why: string) => { console.warn("[stage] falling back to 2D:", why); setStatus("failed"); }, []);
  const use3d = status !== "failed";
  const state = !use3d ? "fallback" : status === "ready" ? "ready" : "loading";
  useEffect(() => { onState?.(state); }, [state, onState]);

  return (
    <div ref={ref} className={`rk-stage overflow-hidden ${className || "relative"}`} data-stage-state={state} data-stage-variant={variant}>
      <StageLights speaking={speaking} />
      {use3d ? <StageCanvas variant={variant} src={src} lite={lite} visible={visible} onReady={onReady} onFail={onFail} handleRef={handle} /> : (
        <div className="absolute inset-0 grid place-items-end px-6 pt-6"><CssAvatar className="max-h-full" /></div>
      )}
      {use3d && status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-live="polite"><span className="rk-chip animate-pulse bg-rk-ink text-xs">Waking Yuri up…</span></div>
      ) : null}
      {children}
      {controls && use3d && status === "ready" ? (
        <div className="absolute right-2 top-2 z-20 inline-flex gap-1">
          <button type="button" className="rk-chip !px-2" aria-label="Zoom in" onClick={() => handle.current?.zoom(1)}><Plus className="size-3.5" /></button>
          <button type="button" className="rk-chip !px-2" aria-label="Zoom out" onClick={() => handle.current?.zoom(-1)}><Minus className="size-3.5" /></button>
          <button type="button" className="rk-chip !px-2" aria-label="Reset view" onClick={() => handle.current?.reset()}><RotateCcw className="size-3.5" /></button>
        </div>
      ) : null}
    </div>
  );
}
