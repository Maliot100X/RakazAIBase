import { z } from "zod";

/** Every key name from .env.example (auto-synced). All optional; empty = feature idle. */
export const ENV_KEYS = [
  "ALCHEMY_API_KEY",
  "ALCHEMY_BASE_RPC_URL",
  "ALCHEMY_ZORA_RPC_URL",
  "API_SERVER_KEY",
  "BANKR_API_KEY",
  "BANKR_API_URL",
  "BASESCAN_API_KEY",
  "BRAVE_SEARCH_API_KEY",
  "CHAIN",
  "CLANKER_API_KEY",
  "CLANKER_API_URL",
  "CLANKER_ENABLED",
  "CLANKER_PENDING_TEAM_KEY",
  "CRON_SECRET",
  "DASHBOARD_PASSWORD",
  "DATABASE_URL",
  "DEEPGRAM_API_KEY",
  "EXECUTE_ENABLED",
  "FARCASTER_HEADER",
  "FARCASTER_PAYLOAD",
  "FARCASTER_SIGNATURE",
  "FIRECRAWL_API_KEY",
  "FREELLM_API_KEY",
  "FREELLM_BASE_URL",
  "GITHUB_REPO_NAME",
  "GITHUB_TOKEN",
  "HELIUS_API_KEY",
  "HELIUS_DEVNET_RPC_URL",
  "HELIUS_RPC_URL",
  "JUPITER_API_KEY",
  "JUPITER_API_KEY_ALT",
  "JUPITER_PUBLISHABLE_KEY",
  "LIVE_SECRET",
  "LLM_MODEL",
  "NEON_AI_GATEWAY_BASE_URL",
  "NEON_AI_GATEWAY_TOKEN",
  "NEON_API_KEY",
  "NEON_APP_NAME",
  "NEON_AUTH_URL",
  "NEON_JWKS_URL",
  "NEON_LAUNCHPAD_DATABASE_URL",
  "NEON_PROJECT_ID",
  "NEON_PROJECT_NUMBER",
  "NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_BASE_RPC_URL",
  "NEXT_PUBLIC_CHAIN_ID",
  "NEXT_PUBLIC_PINATA_GATEWAY",
  "NEXT_PUBLIC_REOWN_PROJECT_ID",
  "NEXT_PUBLIC_TELEGRAM_URL",
  "NEXT_PUBLIC_X_URL",
  "NEYNAR_API_KEY",
  "NEYNAR_CLIENT_ID",
  "NEYNAR_SNAPCHAIN_GRPC_URL",
  "NEYNAR_SNAPCHAIN_HTTPS_URL",
  "NEYNAR_WEBHOOK_SECRET",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_BASE_URL",
  "PIMLICO_API_KEY",
  "PINATA_API_KEY",
  "PINATA_API_KEY_LEGACY",
  "PINATA_API_SECRET",
  "PINATA_API_SECRET_LEGACY",
  "PINATA_JWT",
  "PLATFORM_TREASURY_ADDRESS",
  "PLATFORM_TREASURY_PRIVATE_KEY",
  "POLLINATIONS_API_KEY",
  "RAKAZA_VOICE",
  "RAKAZA_LIVE_AGENT_HANDLE",
  "RAKAZA_LIVE_AGENT_API_KEY",
  "RAKAZA_LIVE_AGENT_BEARER",
  "RAKAZA_LIVE_AGENT_PROFILE_URL",
  "RAKAZA_LIVE_AGENT_DASHBOARD_URL",
  "RAKAZA_LIVE_AGENT_MCP_URL",
  "RAKAZA_LIVE_AGENT_API_BASE",
  "RIVER_AGENT",
  "RIVER_BASE_URL",
  "RIVER_MODEL_AGENT",
  "RIVER_MODEL_PERSONA",
  "RIVER_RAKAZO",
  "SELF_LAUNCH_ENABLED",
  "SESSION_SECRET",
  "SOLANATRACKER_API_KEY",
  "SPONSORED_ENABLED",
  "TELEGRAM_ADMIN_ID",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_MOCK",
  "UPCLOUD_API_TOKEN",
  "UPSTASH_REDIS_READONLY_TOKEN",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_URL",
  "VERCEL_TOKEN",
  "XAI_API_KEY",
  "XAI_BASE_URL",
  "QSTASH_TOKEN",
  "SPLITS_API_KEY",
  "QSTASH_NEXT_SIGNING_KEY",
  "QSTASH_CURRENT_SIGNING_KEY",
  "SELF_LAUNCH_SERVICE_FEE_USD",
  "SELF_LAUNCH_SERVICE_FEE_ETH",
  "MAX_LAUNCH_ETH",
  "MAX_DAILY_SPEND_ETH",
  "NEXT_PUBLIC_TOKEN_ADDRESS",
  "TREASURY_ENCRYPTION_KEY",
  "DEV_PREVIEW_OWNER_PAGES",
  "POLLINATIONS_IMAGE_MODEL",
] as const;
export type EnvKey = (typeof ENV_KEYS)[number];

const opt = z.string().optional().default("");
const shape = Object.fromEntries(ENV_KEYS.map((k) => [k, opt])) as Record<EnvKey, typeof opt>;

const schema = z.object({
  ...shape,
  CHAIN: z.literal("base").catch("base"),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().catch(8453),
  ALCHEMY_BASE_RPC_URL: opt,
  NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL: opt,
  BANKR_API_KEY: opt,
  CLANKER_API_KEY: opt,
  NEYNAR_API_KEY: opt,
  NEXT_PUBLIC_REOWN_PROJECT_ID: opt,
  FREELLM_API_KEY: opt,
  FREELLM_BASE_URL: opt,
  DATABASE_URL: opt,
  UPSTASH_REDIS_REST_URL: opt,
  UPSTASH_REDIS_REST_TOKEN: opt,
  DEEPGRAM_API_KEY: opt,
  PINATA_JWT: opt,
  TELEGRAM_BOT_TOKEN: opt,
  SESSION_SECRET: opt,
  CRON_SECRET: opt,
});

export const env = schema.parse(process.env);
export type Env = typeof env;

const has = (...v: string[]) => v.every((x) => x.length > 0);
export const integrations = {
  alchemy: has(env.ALCHEMY_API_KEY) || has(env.ALCHEMY_BASE_RPC_URL) || has(env.NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL) || has(env.NEXT_PUBLIC_BASE_RPC_URL),
  bankr: has(env.BANKR_API_KEY),
  clanker: has(env.CLANKER_API_KEY) && /^(true|1)$/i.test(env.CLANKER_ENABLED.trim()),
  neynar: has(env.NEYNAR_API_KEY),
  reown: has(env.NEXT_PUBLIC_REOWN_PROJECT_ID),
  freellm: has(env.FREELLM_API_KEY) || has(env.FREELLM_BASE_URL),
  neon: has(env.DATABASE_URL),
  upstash: has(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN),
  deepgram: has(env.DEEPGRAM_API_KEY),
  pinata: has(env.PINATA_JWT),
  telegram: has(env.TELEGRAM_BOT_TOKEN),
} as const;
export type Integration = keyof typeof integrations;

export class NotConfiguredError extends Error {
  status = 503;
  constructor(public integration: Integration) {
    super(`${integration} not configured`);
  }
}
export function requireIntegration(name: Integration) {
  if (!integrations[name]) throw new NotConfiguredError(name);
}

const on = (v: string) => /^(true|1)$/i.test(v.trim());
/** Honest health surface (Phase 11): configured/idle per integration + flags. Never exposes values. */
export function integrationsHealth() {
  const e = process.env as Record<string, string | undefined>;
  const s = (k: string) => (e[k] ?? "").trim().length > 0;
  const st = (b: boolean) => (b ? "configured" : "idle");
  return {
    ...Object.fromEntries(Object.entries(integrations).map(([k, v]) => [k, st(v)])),
    clanker: integrations.clanker ? "configured" : `idle${on(env.CLANKER_ENABLED) ? "" : " (CLANKER_ENABLED off)"}`,
    telegramOwner: s("TELEGRAM_ADMIN_ID") ? "configured" : "idle (TELEGRAM_ADMIN_ID unset: owner unset)",
    river: s("RIVER_BASE_URL") && (s("RIVER_RAKAZO") || s("RIVER_AGENT")) ? "configured" : s("RIVER_BASE_URL") ? "idle (RIVER_RAKAZO/RIVER_AGENT unset)" : "idle",
    qstash: st(s("QSTASH_TOKEN")),
    splits: st(s("SPLITS_API_KEY")),
    execute: on(e.EXECUTE_ENABLED ?? "") ? "enabled" : "off",
    sponsored: on(e.SPONSORED_ENABLED ?? "") ? "enabled" : "off",
    farcasterManifest: s("FARCASTER_HEADER") && s("FARCASTER_PAYLOAD") && s("FARCASTER_SIGNATURE") ? "signed" : "idle (unsigned)",
    treasuryEncryption: s("TREASURY_ENCRYPTION_KEY") ? "configured" : "idle",
  };
}
