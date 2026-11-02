import { createConfig, http } from "wagmi";
import { base } from "viem/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { APP_NAME } from "@/lib/brand";

// Client-visible RPC only (server keys never inlined); falls back to viem's public Base RPC.
const rpc = process.env.NEXT_PUBLIC_BASE_RPC_URL || process.env.NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL || undefined;
export const reownProjectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [base],
  ssr: true,
  transports: { [base.id]: http(rpc) },
  connectors: [
    farcasterMiniApp(),
    injected(),
    // Reown (WalletConnect) fallback only when a project id is configured.
    ...(reownProjectId
      ? [walletConnect({ projectId: reownProjectId, showQrModal: true, metadata: { name: APP_NAME, description: `${APP_NAME} on Base`, url: "https://rakaza.ai", icons: [] } })]
      : []),
  ],
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
