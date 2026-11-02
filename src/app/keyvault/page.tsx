import { KeyVaultTool } from "@/components/keyvault-tool";
import { SessionGate } from "@/components/auth/session-gate";

export const metadata = { title: "Key vault" };

export default function Page() {
  return (
    <SessionGate>
      <section className="mx-auto flex w-full max-w-[424px] flex-col gap-3 font-mono text-sm">
        <h1 className="text-base font-bold">Key vault</h1>
        <p className="text-xs text-muted-foreground">AES-256-GCM + PBKDF2 in your browser. Keys stay in this browser&apos;s localStorage and never reach the server.</p>
        <KeyVaultTool />
      </section>
    </SessionGate>
  );
}
