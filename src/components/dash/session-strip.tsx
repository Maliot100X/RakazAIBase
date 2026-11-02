"use client";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import { useSession } from "@/components/auth/session-gate";
import { ConnectButton } from "@/components/connect-button";

/** Me/Launch identity strip: real session + real wallet balance only. */
export function SessionStrip() {
  const { session } = useSession();
  const { address } = useAccount();
  const bal = useBalance({ address, query: { enabled: !!address } });
  const who = session?.ok ? (session.fid ? `fid ${session.fid}` : session.address ? `${session.address.slice(0, 6)}…${session.address.slice(-4)}` : session.role ?? "signed in") : "Guest";
  return (
    <div className="flex items-center gap-3 rounded-[1.4rem] border-2 border-rk-ink bg-card p-4 shadow-[3px_3px_0_var(--rk-pink)]">
      <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-rk-honey font-display font-black text-rk-honey">{session?.ok ? "R" : "?"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{who}</p>
        <p className="font-mono text-xs tabular-nums text-muted-foreground">
          {address ? (bal.data ? `${Number(formatEther(bal.data.value)).toFixed(5)} ETH · Base` : "balance …") : "No wallet connected"}
        </p>
      </div>
      <ConnectButton compact />
    </div>
  );
}
