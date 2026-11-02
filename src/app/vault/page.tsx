import { ConnectButton } from "@/components/connect-button";
import { VaultOverview } from "@/components/vault-overview";
import { SessionGate } from "@/components/auth/session-gate";

export const metadata = { title: "Vault" };

export default function Page() {
  return (
    <SessionGate>
      <section className="mx-auto flex w-full max-w-[424px] flex-col gap-3 font-mono text-sm">
        <h1 className="text-base font-bold">Vault · Base</h1>
        <div className="rounded-lg border-[1.5px] border-rk-lav/50 p-3"><ConnectButton /></div>
        <VaultOverview />
      </section>
    </SessionGate>
  );
}
