import "server-only";

/** Resolve a Base mainnet HTTP RPC. Returns null (idle) when nothing is configured. */
export function resolveBaseRpc(e: NodeJS.ProcessEnv = process.env): string | null {
  const direct = e.NEXT_PUBLIC_BASE_RPC_URL || e.ALCHEMY_BASE_RPC_URL || e.NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL;
  if (direct) return direct;
  if (e.ALCHEMY_API_KEY) return `https://base-mainnet.g.alchemy.com/v2/${e.ALCHEMY_API_KEY}`;
  return null;
}
