"use client";
import { useEffect, useState } from "react";
import { loadIndex, loadSealed, type VaultIndex } from "@/lib/vault/crypto";

type Health = { ok: boolean; idle?: boolean; address?: string; eth?: string; chainId: number; error?: string };
type Crypto = { treasuryEncryption?: string; roundtrip?: boolean; algorithm?: string };

export function VaultOverview() {
  const [index, setIndex] = useState<VaultIndex>([]);
  const [hasVault, setHasVault] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [crypto, setCrypto] = useState<Crypto | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(loadIndex()); setHasVault(!!loadSealed());
    fetch("/api/treasury/health").then((r) => r.json()).then(setHealth).catch(() => setHealth({ ok: false, chainId: 8453, error: "unreachable" }));
    fetch("/api/vault/crypto").then((r) => r.json()).then(setCrypto).catch(() => setCrypto({ treasuryEncryption: "idle" }));
  }, []);

  return (
    <div className="grid w-full max-w-xl gap-4">
      <section className="rounded-lg border-[1.5px] border-rk-lav/50 p-3 text-sm">
        <h2 className="mb-1">Treasury health</h2>
        {!health ? "…" : health.ok ? (
          <><p className="break-all">{health.address}</p><p>{health.eth} ETH · chain {health.chainId}</p></>
        ) : health.idle ? <p className="text-muted-foreground">Idle — RPC or treasury address not configured.</p> : <p className="text-red-400">{health.error ?? "unavailable"}</p>}
      </section>
      <section className="rounded-lg border-[1.5px] border-rk-lav/50 p-3 text-sm">
        <h2 className="mb-1">Server seal (TREASURY_ENCRYPTION_KEY)</h2>
        {!crypto ? "…" : (
          <p>{crypto.treasuryEncryption === "configured" ? `Configured · ${crypto.algorithm ?? "aes-256-gcm"} · roundtrip ${crypto.roundtrip ? "ok" : "fail"}` : "Idle — key unset"}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">Used for server-side launch/vault seals. Client keyvault stays local passphrase.</p>
      </section>
      <section className="rounded-lg border-[1.5px] border-rk-lav/50 p-3 text-sm">
        <h2 className="mb-1">Local vault {hasVault ? "(encrypted, locked)" : "(none)"}</h2>
        {index.length === 0 ? <p className="text-muted-foreground">No entries.</p> : index.map((e) => <p key={e.id}>{e.label} — {e.address.slice(0, 6)}…{e.address.slice(-4)}</p>)}
        <a href="/keyvault" className="mt-2 inline-block underline">Unlock / manage in /keyvault</a>
      </section>
    </div>
  );
}
