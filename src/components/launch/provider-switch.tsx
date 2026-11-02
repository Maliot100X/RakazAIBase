"use client";
import { useState } from "react";

type P = { id: "bankr" | "clanker"; label: string; status: "ready" | "idle"; note: string };
export function ProviderSwitch({ providers }: { providers: P[] }) {
  const first = providers.find((p) => p.status === "ready")?.id ?? null;
  const [sel, setSel] = useState(first);
  return (
    <div role="radiogroup" aria-label="Launch provider" className="grid grid-cols-2 gap-2">
      {providers.map((p) => {
        const off = p.status !== "ready";
        const on = sel === p.id;
        return (
          <button key={p.id} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => setSel(p.id)}
            className={`min-h-11 rounded-xl border-2 border-rk-ink px-3 py-2 text-left text-sm ${on ? "bg-rk-honey" : "bg-card"} disabled:cursor-not-allowed disabled:opacity-60`}>
            <span className="block font-semibold">{p.label}</span>
            <span className="block text-xs">{off ? "Idle" : on ? "Selected" : "Ready"} · {p.note}</span>
          </button>
        );
      })}
    </div>
  );
}
