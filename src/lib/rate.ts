import "server-only";
import { limiter } from "@/lib/upstash";

/** Upstash sliding window when configured, else in-memory per instance. */
const mem = new Map<string, number[]>();
function memHit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (mem.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  mem.set(key, hits);
  if (mem.size > 5000) for (const [k, v] of mem) if (!v.some((t) => now - t < windowMs)) mem.delete(k);
  return hits.length <= max;
}
const WIN_MS = { s: 1000, m: 60_000, h: 3_600_000 } as const;

export function ipOf(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export async function allow(scope: string, id: string, max: number, n: number, unit: "s" | "m" | "h"): Promise<boolean> {
  try {
    const lim = limiter(scope, max, `${n} ${unit}`);
    if (lim) return (await lim.limit(id)).success;
  } catch { /* fall through */ }
  return memHit(`${scope}:${id}`, max, n * WIN_MS[unit]);
}
