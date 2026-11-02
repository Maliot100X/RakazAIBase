"use client";
import { useQuery } from "@tanstack/react-query";
import { Chip } from "@/components/shell/page-head";

export function HealthStatus() {
  const q = useQuery({ queryKey: ["health"], queryFn: async () => { const r = await fetch("/api/health"); return { ok: r.ok, body: await r.json() as unknown }; } });
  if (q.isPending) return <div className="rk-card-hard p-4"><div className="rk-skel h-24" /></div>;
  if (q.isError) return <Chip tone="failed">Health check is down</Chip>;
  return (<div className="rk-card-hard space-y-3 p-4">
    <Chip tone={q.data.ok ? "ok" : "failed"}>{q.data.ok ? "Responding" : "Error"}</Chip>
    <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap font-mono text-xs tabular-nums">{JSON.stringify(q.data.body, null, 2)}</pre>
  </div>);
}
