"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const W = 320, H = 420;
type Obstacle = { x: number; y: number; w: number; h: number };

export function RideEmGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const state = useRef({ y: H / 2, vy: 0, obstacles: [] as Obstacle[], t: 0, dead: false, score: 0 });

  useEffect(() => {
    try { setBest(Number(localStorage.getItem("rakaza.rideem.best") || 0)); } catch { /* */ }
  }, []);

  const reset = useCallback(() => {
    state.current = { y: H / 2, vy: 0, obstacles: [], t: 0, dead: false, score: 0 };
    setScore(0); setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) return;
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf = 0;
    const flap = () => { if (!state.current.dead) state.current.vy = -6.2; };
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space" || e.key === " ") { e.preventDefault(); flap(); } };
    const onPtr = () => flap();
    window.addEventListener("keydown", onKey);
    c.addEventListener("pointerdown", onPtr);

    const loop = () => {
      const s = state.current;
      s.t += 1;
      s.vy += 0.35;
      s.y += s.vy;
      if (s.t % 70 === 0) {
        const gap = 110 + Math.random() * 40;
        const top = 40 + Math.random() * (H - gap - 80);
        s.obstacles.push({ x: W + 10, y: 0, w: 36, h: top }, { x: W + 10, y: top + gap, w: 36, h: H - (top + gap) });
      }
      s.obstacles = s.obstacles.filter((o) => o.x > -50).map((o) => ({ ...o, x: o.x - 2.4 }));
      const bird = { x: 64, y: s.y, w: 22, h: 18 };
      const hit = s.y < 0 || s.y + bird.h > H || s.obstacles.some((o) => bird.x < o.x + o.w && bird.x + bird.w > o.x && bird.y < o.y + o.h && bird.y + bird.h > o.y);
      if (hit && !s.dead) {
        s.dead = true; setRunning(false);
        const sc = Math.floor(s.score);
        setScore(sc);
        try {
          const b = Math.max(sc, Number(localStorage.getItem("rakaza.rideem.best") || 0));
          localStorage.setItem("rakaza.rideem.best", String(b)); setBest(b);
        } catch { /* */ }
      }
      s.score += 0.05;
      if (!s.dead) setScore(Math.floor(s.score));

      ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#f5b942";
      for (const o of s.obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "#ff6b4a"; ctx.beginPath(); ctx.ellipse(bird.x + 11, bird.y + 9, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "12px monospace"; ctx.fillText(`score ${Math.floor(s.score)}`, 10, 18);
      if (!s.dead) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", onKey); c.removeEventListener("pointerdown", onPtr); };
  }, [running]);

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} width={W} height={H} className="mx-auto block w-full max-w-[320px] rounded-lg border border-white/10" />
      <div className="flex items-center justify-between text-sm">
        <span>Score {score}</span>
        <span>Best {best}</span>
      </div>
      <button type="button" className="rk-btn-honey w-full justify-center" onClick={reset}>{running ? "Restart" : "Play Ride ’Em"}</button>
      <p className="text-xs opacity-70">Tap / Space to flap. Local only — scores stay in this browser. Base Mini App ready.</p>
    </div>
  );
}
