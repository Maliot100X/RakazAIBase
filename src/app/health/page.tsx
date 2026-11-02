import { HealthStatus } from "@/components/health-status";
import { SessionGate } from "@/components/auth/session-gate";

export const metadata = { title: "Health" };

export default function HealthPage() {
  return (
    <SessionGate>
      <section className="mx-auto w-full max-w-[424px] font-mono text-sm">
        <h1 className="mb-1 text-base font-bold">Health</h1>
        <p className="mb-3 text-xs text-muted-foreground">Infra and integration status.</p>
        <HealthStatus />
      </section>
    </SessionGate>
  );
}
