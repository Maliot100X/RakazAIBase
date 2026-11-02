import { integrations, integrationsHealth, env } from "@/lib/env";
import { CHAIN, CHAIN_ID, BLOCK_EXPLORER } from "@/lib/chain";
import { APP_NAME, CHARACTER } from "@/lib/brand";
import { CREATOR_BPS, TREASURY_BPS, isEvmAddress, buildSplit, verifySplit } from "@/lib/launch/sponsored-split";
import { executeEnabled, feeTotals, listLedger, SPLIT_LABEL } from "@/lib/launch/fees";
import { sponsoredFlags, getRun, storageMode, SPONSORED_CAPS } from "@/lib/launch/sponsored";
import { GET as treasuryHealthGET } from "@/app/api/treasury/health/route";
import { GET as healthGET } from "@/app/api/health/route";
import { KNOWLEDGE } from "@/lib/brain/knowledge";
import { resolveBaseRpc } from "@/lib/rpc";
import { planSelfLaunch } from "@/lib/launch/self-launch";
import { sql, ensureSchema } from "@/lib/db";
import { agentByHandle, listAgents } from "@/lib/agents/service";
import { bankrAgentPrompt, bankrStatus } from "@/lib/clients/bankr";
import type { Caller } from "./auth";

/** Base 8453 agent tool registry. Real tools wire Phase 0–7 libs; the rest return {idle:true, reason}. No Solana. */
type Args = Record<string, unknown>;
type Tool = { name: string; description: string; inputSchema: Record<string, unknown>; public?: boolean; run: (a: Args, c?: Caller) => Promise<unknown> };
const obj = (props: Record<string, unknown> = {}, required: string[] = []) => ({ type: "object", properties: props, required, additionalProperties: false });
const addr = { type: "string", pattern: "^0x[0-9a-fA-F]{40}$", description: "ERC-20 / EVM address on Base" };
const idle = (reason: string) => async () => ({ idle: true, reason, chainId: CHAIN_ID });
const treasury = () => (isEvmAddress(process.env.PLATFORM_TREASURY_ADDRESS) ? process.env.PLATFORM_TREASURY_ADDRESS! : null);

async function rpc(method: string, params: unknown[]): Promise<{ ok: true; result: unknown } | { ok: false; idle?: true; reason: string }> {
  const url = resolveBaseRpc(); if (!url) return { ok: false, idle: true, reason: "NotConfigured: Base RPC (ALCHEMY_API_KEY / BASE RPC URL)" };
  try {
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), cache: "no-store", signal: AbortSignal.timeout(8000) });
    const j = (await r.json()) as { result?: unknown; error?: { message?: string } };
    return j.error || !r.ok ? { ok: false, reason: `rpc_error: ${String(j.error?.message ?? r.status).slice(0, 120)}` } : { ok: true, result: j.result };
  } catch { return { ok: false, reason: "rpc_unreachable" }; }
}
const badAddr = { ok: false, error: "address must be a 0x EVM address" };
const scanUrl = (a: string) => `${BLOCK_EXPLORER.replace(/\/$/, "")}/address/${a}`;

async function neynarUser(username: string) {
  if (!integrations.neynar) return { idle: true, reason: "NotConfigured: neynar" };
  const r = await fetch(`https://api.neynar.com/v2/farcaster/user/by_username?username=${encodeURIComponent(username)}`, { headers: { "x-api-key": env.NEYNAR_API_KEY ?? "", accept: "application/json" }, cache: "no-store" });
  if (!r.ok) return { ok: false, status: r.status };
  const j = (await r.json()) as { user?: { fid: number; username: string; display_name?: string; follower_count?: number; verified_addresses?: unknown } };
  return j.user ? { ok: true, fid: j.user.fid, username: j.user.username, displayName: j.user.display_name, followers: j.user.follower_count, verifiedAddresses: j.user.verified_addresses } : { ok: false, error: "not_found" };
}

const BANKR_FLOW = ["POST /api/bankr/prompt (owner) {prompt} -> 202 {jobId}", "GET /api/bankr/job/{jobId} (owner) until completed|failed|cancelled (~2s poll)", "Sponsored launch: /api/v1/launch/sponsored/prepare -> start (approve:true) -> Bankr job; live only when EXECUTE_ENABLED && SPONSORED_ENABLED", "Agent tools bankr_price / bankr_quote are read-only prompts and never execute"];
async function dbList(query: string, limit: unknown, key: string) {
  const q = sql(); if (!q) return { idle: true, reason: "NotConfigured: DATABASE_URL", [key]: [] };
  try { await ensureSchema(); return { ok: true, [key]: await q.query(query, [Math.min(Math.max(1, Math.floor(Number(limit ?? 20)) || 20), 50)]), chainId: CHAIN_ID }; }
  catch { return { ok: true, idle: true, reason: "table unavailable on this database; empty", [key]: [] }; }
}

export const TOOLS: Tool[] = [
  { name: "health", description: "Integration health (configured/idle) for the Base terminal.", inputSchema: obj(), public: true, run: async () => (await healthGET()).json() },
  { name: "platform_info", description: `${APP_NAME} platform info: chain, split, flags.`, inputSchema: obj(), public: true,
    run: async () => ({ app: APP_NAME, character: CHARACTER, chain: CHAIN, chainId: CHAIN_ID, explorer: BLOCK_EXPLORER, sponsoredSplit: SPLIT_LABEL, executeEnabled: executeEnabled(), launchProviders: { bankr: integrations.bankr ? "configured" : "idle", clanker: "idle" }, sponsored: sponsoredFlags(), caps: SPONSORED_CAPS }) },
  { name: "integrations_health", description: "Which integrations are configured.", inputSchema: obj(), public: true, run: async () => integrationsHealth() },
  { name: "preview_fee_split", description: "Preview the sponsored 70/30 creator/treasury fee split for a Base fee recipient.", inputSchema: obj({ feeRecipient: addr }, ["feeRecipient"]), public: true,
    run: async (a) => { if (!isEvmAddress(a.feeRecipient)) return { ok: false, error: "feeRecipient must be a 0x address" }; const t = treasury(); if (!t) return { idle: true, reason: "NotConfigured: PLATFORM_TREASURY_ADDRESS", creatorBps: CREATOR_BPS, treasuryBps: TREASURY_BPS }; const s = buildSplit(a.feeRecipient, t); return { ok: true, split: s, check: verifySplit(s, t) }; } },
  { name: "fee_destination", description: "Where sponsored fees route (treasury share) on Base.", inputSchema: obj(), public: true, run: async () => ({ treasury: treasury(), creatorBps: CREATOR_BPS, treasuryBps: TREASURY_BPS, chainId: CHAIN_ID }) },
  { name: "wallet_fees", description: "Fee ledger totals (dry-run/memory or Neon).", inputSchema: obj(), run: async () => ({ totals: await feeTotals(), ledger: await listLedger(20) }) },
  { name: "treasury_health", description: "Treasury ETH balance on Base (read-only).", inputSchema: obj(), public: true, run: async () => (await treasuryHealthGET()).json() },
  { name: "launch_sponsored_guide", description: "How the sponsored 70/30 launch on Base works (Bankr provider; dry-run unless owner enables execute).", inputSchema: obj(), public: true,
    run: async () => ({ steps: ["POST /api/v1/launch/sponsored/prepare (owner session) with name, symbol, feeRecipient (0x)", "Owner reviews ticket; POST /api/v1/launch/sponsored/start", "Poll GET /api/v1/launch/sponsored/status/{id} or /api/v1/launch/sponsored/{id|0xToken} (owner) or launch_sponsored_status", "Public guide: GET /api/v1/launch/sponsored/guide"], split: SPLIT_LABEL, provider: "bankr", clanker: "idle", dryRun: !sponsoredFlags().live, storage: storageMode(), note: "Agents cannot spend; launches require owner approval." }) },
  { name: "launch_sponsored_status", description: "Status of a sponsored launch run by id (persisted in Upstash; memory fallback).", inputSchema: obj({ id: { type: "string" } }, ["id"]), run: async (a) => { const { run, storage } = await getRun(String(a.id ?? "")); return run ? { ok: true, run, storage } : { ok: false, error: "not_found", storage }; } },
  { name: "farcaster_user", description: "Look up a Farcaster user via Neynar.", inputSchema: obj({ username: { type: "string" } }, ["username"]), run: async (a) => neynarUser(String(a.username ?? "")) },
  { name: "project_knowledge", description: "Project knowledge base (public facts).", inputSchema: obj(), public: true, run: async () => ({ ok: true, knowledge: KNOWLEDGE }) },
  { name: "wallet_balance", description: "Base ETH balance for a 0x address (read-only RPC).", inputSchema: obj({ address: addr }, ["address"]), public: true,
    run: async (a) => { if (!isEvmAddress(a.address)) return badAddr; const r = await rpc("eth_getBalance", [a.address, "latest"]); if (!r.ok) return { ...r, chainId: CHAIN_ID };
      const wei = BigInt(String(r.result)); return { ok: true, address: a.address, wei: wei.toString(), eth: Number(wei) / 1e18, chainId: CHAIN_ID }; } },
  { name: "verify_launch", description: "Check a Base address has deployed contract code (existence check only; not a full launch verification).", inputSchema: obj({ address: addr }, ["address"]), public: true,
    run: async (a) => { if (!isEvmAddress(a.address)) return badAddr; const r = await rpc("eth_getCode", [a.address, "latest"]); if (!r.ok) return { ...r, verified: false, chainId: CHAIN_ID };
      const code = String(r.result ?? "0x"); const hasCode = code.length > 2; return { ok: true, address: a.address, hasCode, codeBytes: hasCode ? (code.length - 2) / 2 : 0, verified: false, note: "existence check only; source/launch provenance not verified", explorer: scanUrl(String(a.address)), chainId: CHAIN_ID }; } },
  ...(["trust_check", "scan_token"] as const).map((name): Tool => ({ name, description: `${name === "scan_token" ? "Risk-scan" : "Trust check"} an ERC-20 on Base: address format + contract existence only; no risk score.`, inputSchema: obj({ address: addr }, ["address"]), public: true,
    run: async (a) => { if (!isEvmAddress(a.address)) return badAddr; const r = await rpc("eth_getCode", [a.address, "latest"]);
      return { ok: true, idle: true, address: a.address, formatValid: true, isContract: r.ok ? String(r.result ?? "0x").length > 2 : null, rpc: r.ok ? "ok" : r.reason, riskScore: null, reason: "risk scoring not wired; no score is invented", explorer: scanUrl(String(a.address)), chainId: CHAIN_ID }; } })),
  ...(["prepare_launch_package", "simulate_launch"] as const).map((name): Tool => ({ name, description: `${name === "simulate_launch" ? "Simulate" : "Prepare"} a self-launch on Base (dry-run plan; never signs or sends).`,
    inputSchema: obj({ name: { type: "string" }, symbol: { type: "string" }, image: { type: "string" }, admin: addr }, ["name", "symbol"]),
    run: async (a) => planSelfLaunch({ name: a.name, symbol: a.symbol, image: a.image, admin: a.admin }) })),
  { name: "agent_get", description: "Get a public agent profile by handle (Neon).", inputSchema: obj({ handle: { type: "string" } }, ["handle"]), public: true,
    run: async (a) => { if (!sql()) return { idle: true, reason: "NotConfigured: DATABASE_URL" }; const ag = await agentByHandle(String(a.handle ?? "")); return ag ? { ok: true, agent: ag } : { ok: false, error: "not_found" }; } },
  { name: "agents_list", description: "List public agents on Base (Neon, newest first).", inputSchema: obj({ limit: { type: "number" } }), public: true,
    run: async (a) => (sql() ? { ok: true, agents: await listAgents(Number(a.limit ?? 20)) } : { idle: true, reason: "NotConfigured: DATABASE_URL", agents: [] }) },
  { name: "list_tokens", description: "Tokens launched via the terminal on Base (Neon tokens table).", inputSchema: obj({ limit: { type: "number" } }), public: true,
    run: async (a) => dbList(`SELECT address, chain, name, symbol, uri, creator, provider, status, created_at FROM tokens WHERE NOT hidden AND chain = 'base' ORDER BY created_at DESC LIMIT $1`, a.limit, "tokens") },
  { name: "community_feed", description: "Latest community posts (Neon posts).", inputSchema: obj({ limit: { type: "number" } }), public: true,
    run: async (a) => dbList(`SELECT p.id, p.category, p.body, p.kind, p.token_address, p.reply_to, p.created_at, ag.handle, ag.name FROM posts p JOIN agents ag ON ag.id = p.agent_id WHERE NOT p.hidden AND NOT ag.hidden AND NOT ag.disabled ORDER BY p.created_at DESC LIMIT $1`, a.limit, "posts") },
  { name: "latest_diary", description: "Rakaza's latest diary entries (Neon diary_entries).", inputSchema: obj({ limit: { type: "number" } }), public: true,
    run: async (a) => dbList(`SELECT id, body, created_at FROM diary_entries ORDER BY created_at DESC LIMIT $1`, a.limit ?? 5, "entries") },
  { name: "bankr_status", description: "Bankr agent provider status (ready/idle) and how the Bankr job flow works.", inputSchema: obj(), public: true,
    run: async () => ({ ...bankrStatus(), flow: BANKR_FLOW, sponsored: sponsoredFlags(), chainId: CHAIN_ID }) },
  { name: "bankr_price", description: "Token price on Base via a read-only Bankr agent prompt (no Jupiter).", inputSchema: obj({ token: { type: "string", description: "symbol or 0x address" } }, ["token"]),
    run: async (a) => { const t = String(a.token ?? "").trim().slice(0, 64); if (!t) return { ok: false, error: "token required" };
      return bankrAgentPrompt(`What is the current price of ${t} on Base (chain 8453)? Read-only price lookup; do not trade or sign anything.`); } },
  { name: "bankr_quote", description: "Swap quote on Base via a read-only Bankr agent prompt. Never executes.", inputSchema: obj({ from: { type: "string" }, to: { type: "string" }, amount: { type: "string" } }, ["from", "to", "amount"]),
    run: async (a) => { const [f, t, amt] = [a.from, a.to, a.amount].map((x) => String(x ?? "").trim().slice(0, 64)); if (!f || !t || !amt) return { ok: false, error: "from, to, amount required" };
      const r = await bankrAgentPrompt(`Quote only, do NOT execute: how much ${t} would I get for ${amt} ${f} on Base (chain 8453)? Do not swap, sign or send any transaction.`);
      return { ...r, executes: false }; } },
  { name: "list_games", description: "Games available in the Base Mini App terminal.", inputSchema: obj(), public: true,
    run: async () => ({ ok: true, games: [{ id: "ride-em", title: "Ride ’Em", path: "/games/ride-em", playable: true, chainId: CHAIN_ID }], chainId: CHAIN_ID }) },
  { name: "get_leaderboard", description: "Leaderboard (Neon game_runs when present; otherwise honest empty).", inputSchema: obj({ limit: { type: "number" } }), public: true,
    run: async (a) => dbList(`SELECT id, agent_id, score, created_at FROM game_runs ORDER BY score DESC LIMIT $1`, a.limit ?? 20, "rows") },
  // idle stubs (Base semantics, from AUDIT_RAKAZA_SURFACE)
  ...([
    ["rakaza", "Chat with Rakaza (use /api/chat in-app)."],
    ["token_stats", "ERC-20 stats on Base."], ["token_candles", "ERC-20 candles on Base."],
    ["compare_addresses", "Compare EVM addresses."], ["scan_lookalikes", "Lookalike ERC-20 scan."],
    ["token_authorities", "ERC-20 owner/role check."],
    ["draft_token", "Draft token metadata."],
    ["launch_sponsored_prepare", "Prepare sponsored launch ticket (owner-session REST only)."], ["launch_sponsored_start", "Start sponsored launch (owner approval required)."],
    ["clanker_launch", "Clanker launch (idle by policy)."], ["generate_image", "Generate token image."],
    ["community_post", "Post to community / Farcaster."],
  ] as const).map(([name, description]): Tool => ({ name, description, inputSchema: obj(), run: idle(name.startsWith("clanker") ? "NotConfigured: clanker idle" : name.startsWith("launch_sponsored_") ? "use owner REST /api/v1/launch/sponsored/*" : "not wired yet (idle; no data invented)") })),
];

export const describeTool = (t: Tool) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema });
export async function callTool(name: string, args: unknown, caller?: Caller): Promise<{ ok: true; result: unknown } | { ok: false; error: string; message: string }> {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return { ok: false, error: "unknown_tool", message: name };
  if (!t.public && !caller) return { ok: false, error: "unauthorized", message: "Bearer agent key required" };
  try { return { ok: true, result: await t.run((args && typeof args === "object" ? args : {}) as Args, caller) }; }
  catch (e) { return { ok: false, error: "tool_error", message: e instanceof Error ? e.message.slice(0, 200) : "error" }; }
}
