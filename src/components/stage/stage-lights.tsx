"use client";
/** Lite stage backdrop for the Talk panel (songs / beat-pulsed beams are Phase 3+ HOLD). Soft lav/ink gradient + vignette; pink glow only while she speaks. */
export function StageLights({ speaking = false }: { speaking?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_30%,#3a2470_0%,#22124a_45%,#120828_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[radial-gradient(70%_60%_at_50%_100%,rgba(157,123,255,.28),transparent_75%)]" />
      <div className="absolute inset-x-[18%] bottom-[6%] h-6 rounded-[50%] bg-black/35 blur-md" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 transition-opacity duration-300" style={{ opacity: speaking ? 0.55 : 0.12, background: "radial-gradient(ellipse at 50% 100%, rgba(255,95,168,.5), transparent 70%)" }} />
      <div className="absolute inset-0 shadow-[inset_0_0_60px_18px_rgba(18,8,40,.85)]" />
    </div>
  );
}
