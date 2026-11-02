"use client";
import { useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useBalance } from "wagmi";
import { formatEther } from "viem";
import { sdk } from "@farcaster/miniapp-sdk";
import { Button } from "@/components/ui/button";
import { reownProjectId } from "@/lib/wagmi/config";

export function ConnectButton({ compact = false }: { compact?: boolean } = {}) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const bal = useBalance({ address, query: { enabled: !!address } });

  // Auto-connect via Farcaster connector inside a Mini App host.
  useEffect(() => {
    if (isConnected) return;
    sdk.isInMiniApp().then((ok) => {
      const fc = connectors.find((c) => c.id === "farcaster" || c.id === "farcasterMiniApp");
      if (ok && fc) connect({ connector: fc });
    }).catch(() => {});
  }, [isConnected, connectors, connect]);

  if (compact) {
    if (isConnected && address)
      return (
        <button onClick={() => disconnect()} aria-label="Disconnect wallet"
          className="flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-[var(--rk-line)] px-3 font-mono text-xs tabular-nums">
          <span className="size-2 rounded-full bg-rk-mint" />{address.slice(0, 6)}…{address.slice(-4)}
        </button>
      );
    const first = connectors[0];
    return (
      <button disabled={!first || isPending} onClick={() => first && connect({ connector: first })}
        className="min-h-11 rounded-full border-[1.5px] border-[var(--rk-line)] px-4 text-sm font-semibold disabled:opacity-50">
        {isPending ? "Connecting…" : "Connect"}
      </button>
    );
  }

  if (isConnected && address)
    return (
      <div className="flex flex-col items-center gap-1 text-sm">
        <span>{address.slice(0, 6)}…{address.slice(-4)} · chain {chainId}</span>
        <span className="text-muted-foreground">{bal.data ? `${formatEther(bal.data.value)} ETH` : "balance …"}</span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>Disconnect</Button>
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {connectors.map((c) => (
          <Button key={c.uid} variant="outline" size="sm" disabled={isPending} onClick={() => connect({ connector: c })}>
            {c.name}
          </Button>
        ))}
      </div>
      {!reownProjectId && <p className="text-xs text-muted-foreground">WalletConnect idle — NEXT_PUBLIC_REOWN_PROJECT_ID not set.</p>}
      {error && <p className="text-xs text-destructive">{error.message}</p>}
    </div>
  );
}
