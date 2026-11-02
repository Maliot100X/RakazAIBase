export const CHAIN = "base" as const;
export const CHAIN_ID = 8453 as const;
export const CHAIN_NAME = "Base";
export const BLOCK_EXPLORER = "https://basescan.org";
export const PUBLIC_RPC_FALLBACK = "https://mainnet.base.org";
export type Chain = typeof CHAIN;
