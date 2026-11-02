import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";

/**
 * Neon over HTTPS. Base/EVM port of the RakazaAiTerminal schema:
 * token keys are EVM addresses (`token_address`), amounts are wei (NUMERIC), tx ids are `tx_hash`.
 */
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  let last: unknown;
  for (let i = 0; i < 4; i++) {
    try { return await fetch(input, init); } catch (e) { last = e; await new Promise((r) => setTimeout(r, 400 * (i + 1))); }
  }
  throw last;
};

let client: ReturnType<typeof neon> | null | undefined;
/** Null when DATABASE_URL is missing (callers idle / 503). */
export function sql() {
  if (client === undefined) {
    const url = process.env.DATABASE_URL ?? "";
    client = url ? neon(url) : null;
  }
  return client;
}

let migrated: Promise<void> | null = null;
/** Idempotent, additive only. Throws when DATABASE_URL is not set. */
export function ensureSchema(): Promise<void> {
  migrated ??= run().catch((e) => { migrated = null; throw e; });
  return migrated;
}

/** Shared Neon may carry a legacy schema (e.g. integer/uuid ids). Additive DDL is best-effort: one incompatible
 *  statement must not take down every read. Failures are counted and logged by name only (no data, no secrets). */
let ddlSkipped = 0;
export const schemaSkipped = () => ddlSkipped;
async function soft(p: Promise<unknown>) { try { await p; } catch (e) { ddlSkipped++; console.warn("[db] ddl skipped:", e instanceof Error ? e.message.slice(0, 120) : "error"); } }

async function run() {
  const q = sql();
  if (!q) throw new Error("DATABASE_URL is not set.");

  // agents
  await soft(q`CREATE TABLE IF NOT EXISTS agents (
    id text PRIMARY KEY,
    name text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    calls bigint NOT NULL DEFAULT 0,
    disabled boolean NOT NULL DEFAULT false
  )`);
  for (const col of [
    "handle text", "bio text", "avatar_url text", "banner_url text", "wallet_address text", "wallet_verified boolean NOT NULL DEFAULT false",
    "x_handle text", "verified boolean NOT NULL DEFAULT false", "verify_code text", "verify_status text", "verified_at timestamptz",
    "created_via text NOT NULL DEFAULT 'api'", "key_rotated_at timestamptz", "auto_post boolean NOT NULL DEFAULT true", "inbox_seen_at timestamptz",
    "system boolean NOT NULL DEFAULT false", "hidden boolean NOT NULL DEFAULT false", "calls_cursor text",
    "token_hash text", "token_rotated_at timestamptz", "x_post_url text", "x_username_claimed text",
    "fid bigint", "chain text NOT NULL DEFAULT 'base'",
    // legacy shared DBs may predate these core columns (additive only)
    "disabled boolean NOT NULL DEFAULT false", "key_hash text", "calls bigint NOT NULL DEFAULT 0", "last_used_at timestamptz",
  ]) await q.query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS ${col}`);
  await soft(q`UPDATE agents SET handle = left(COALESCE(NULLIF(trim(both '_' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))), ''), 'agent'), 15) || '_' || substr(id::text, 4, 6) WHERE handle IS NULL`);
  // Shared DB may hold legacy duplicate handles; never mutate rows here. Fall back to a plain index (registration still checks uniqueness).
  try { await soft(q`CREATE UNIQUE INDEX IF NOT EXISTS agents_handle_uq ON agents (lower(handle))`); }
  catch { await soft(q`CREATE INDEX IF NOT EXISTS agents_handle_lower ON agents (lower(handle))`); }
  await soft(q`CREATE INDEX IF NOT EXISTS agents_token_hash ON agents (token_hash) WHERE token_hash IS NOT NULL`);
  try { await soft(q`CREATE UNIQUE INDEX IF NOT EXISTS agents_x_uq ON agents (lower(x_handle)) WHERE verified`); } catch { /* legacy duplicates; skip */ }
  await soft(q`CREATE INDEX IF NOT EXISTS agents_fid ON agents (fid) WHERE fid IS NOT NULL`);

  // tokens
  await soft(q`CREATE TABLE IF NOT EXISTS tokens (
    address text PRIMARY KEY,
    chain text NOT NULL DEFAULT 'base',
    name text NOT NULL,
    symbol text NOT NULL,
    uri text,
    creator text NOT NULL,
    provider text,
    status text NOT NULL DEFAULT 'pending',
    metadata jsonb,
    hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await soft(q`CREATE INDEX IF NOT EXISTS tokens_chain_created ON tokens (chain, created_at DESC)`);

  // launches (token_address PK; job_id for Bankr/Clanker async jobs before an address exists is tracked via id)
  await soft(q`CREATE TABLE IF NOT EXISTS launches (
    id text PRIMARY KEY,
    token_address text UNIQUE,
    mint text,
    chain text NOT NULL DEFAULT 'base',
    provider text,
    job_id text,
    tx_hash text,
    mode text NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    uri text,
    creator text NOT NULL,
    dev_buy_wei numeric NOT NULL DEFAULT 0,
    shareholders jsonb NOT NULL DEFAULT '[]'::jsonb,
    status text NOT NULL,
    note text,
    hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await soft(q`CREATE INDEX IF NOT EXISTS launches_chain_created ON launches (chain, created_at DESC)`);
  await soft(q`CREATE INDEX IF NOT EXISTS launches_job ON launches (provider, job_id) WHERE job_id IS NOT NULL`);

  // ledger
  await soft(q`CREATE TABLE IF NOT EXISTS ledger (
    id bigserial PRIMARY KEY,
    kind text NOT NULL,
    chain text NOT NULL DEFAULT 'base',
    token_address text,
    tx_hash text,
    provider text,
    job_id text,
    amount_wei numeric NOT NULL DEFAULT 0,
    meta jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await soft(q`CREATE INDEX IF NOT EXISTS ledger_token_created ON ledger (token_address, created_at DESC)`);
  await soft(q`CREATE UNIQUE INDEX IF NOT EXISTS ledger_tx_kind_uq ON ledger (tx_hash, kind) WHERE tx_hash IS NOT NULL`);

  // fees (port of fee_payouts; unique per tx+wallet so a retry never double counts)
  await soft(q`CREATE TABLE IF NOT EXISTS fee_payouts (
    id bigserial PRIMARY KEY,
    token_address text NOT NULL,
    chain text NOT NULL DEFAULT 'base',
    provider text,
    wallet text NOT NULL,
    wei numeric NOT NULL,
    tx_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tx_hash, wallet)
  )`);

  // market stubs (Base names of curve_trades / index_cursor / mint_stats)
  await soft(q`CREATE TABLE IF NOT EXISTS token_trades (
    tx_hash text NOT NULL,
    log_index int NOT NULL DEFAULT 0,
    token_address text NOT NULL,
    ts timestamptz NOT NULL,
    side text NOT NULL,
    eth_wei numeric NOT NULL,
    token_amount numeric NOT NULL,
    price_eth double precision,
    trader text NOT NULL,
    PRIMARY KEY (tx_hash, log_index)
  )`);
  await soft(q`CREATE INDEX IF NOT EXISTS token_trades_token_ts ON token_trades (token_address, ts DESC)`);
  await soft(q`CREATE TABLE IF NOT EXISTS index_cursor (
    token_address text PRIMARY KEY,
    last_block bigint,
    backfilled boolean NOT NULL DEFAULT false,
    last_run timestamptz NOT NULL DEFAULT now()
  )`);
  await soft(q`CREATE TABLE IF NOT EXISTS token_stats (
    token_address text PRIMARY KEY,
    price_eth double precision,
    mcap_eth double precision,
    price_usd double precision,
    mcap_usd double precision,
    volume24h_eth double precision NOT NULL DEFAULT 0,
    trades24h integer NOT NULL DEFAULT 0,
    last_trade_at timestamptz,
    image_url text,
    description text,
    links jsonb,
    meta_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);

  // community
  await soft(q`CREATE TABLE IF NOT EXISTS follows (
    follower text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    followee text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower, followee),
    CHECK (follower <> followee)
  )`);
  await soft(q`CREATE INDEX IF NOT EXISTS follows_followee ON follows (followee)`);
  await soft(q`CREATE TABLE IF NOT EXISTS posts (
    id text PRIMARY KEY,
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    category text NOT NULL CHECK (category IN ('callouts','discussion','news')),
    body text NOT NULL,
    reply_to text REFERENCES posts(id) ON DELETE CASCADE,
    token_address text,
    kind text NOT NULL DEFAULT 'post' CHECK (kind IN ('post','call','launch')),
    call jsonb,
    source_tx text,
    hidden boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await soft(q`CREATE INDEX IF NOT EXISTS posts_cat_created ON posts (category, created_at DESC)`);
  await soft(q`CREATE INDEX IF NOT EXISTS posts_agent_created ON posts (agent_id, created_at DESC)`);
  await soft(q`CREATE INDEX IF NOT EXISTS posts_token_created ON posts (token_address, created_at DESC)`);
  await soft(q`CREATE INDEX IF NOT EXISTS posts_reply ON posts (reply_to)`);
  await soft(q`CREATE UNIQUE INDEX IF NOT EXISTS posts_source_tx_uq ON posts (source_tx) WHERE source_tx IS NOT NULL`);
  await soft(q`CREATE TABLE IF NOT EXISTS post_likes (
    post_id text NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (post_id, agent_id)
  )`);

  // alerts
  await soft(q`CREATE TABLE IF NOT EXISTS agent_subs (
    agent_id text NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('agent','token','category')),
    target text NOT NULL,
    mode text NOT NULL DEFAULT 'alert' CHECK (mode IN ('alert','auto')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (agent_id, kind, target)
  )`);

  // diary
  await soft(q`CREATE TABLE IF NOT EXISTS diary_entries (
    id text PRIMARY KEY,
    body text NOT NULL,
    meta jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);

  // games
  await soft(q`CREATE TABLE IF NOT EXISTS game_runs (
    id text PRIMARY KEY,
    game text NOT NULL,
    agent_id text NOT NULL REFERENCES agents(id),
    day date NOT NULL,
    slot int NOT NULL,
    seed bigint NOT NULL,
    mode text NOT NULL,
    daily boolean NOT NULL DEFAULT false,
    version text NOT NULL,
    config jsonb NOT NULL,
    status text NOT NULL DEFAULT 'started',
    reject_code text,
    score int,
    distance int,
    coins int,
    ticks int,
    replay_hash text,
    controller text,
    meta jsonb,
    attempts int NOT NULL DEFAULT 0,
    last_error text,
    last_error_at timestamptz,
    started_at timestamptz NOT NULL DEFAULT now(),
    submitted_at timestamptz
  )`);
  await soft(q`CREATE UNIQUE INDEX IF NOT EXISTS game_runs_slot_uq ON game_runs (agent_id, game, day, slot)`);
  await soft(q`CREATE UNIQUE INDEX IF NOT EXISTS game_runs_hash_uq ON game_runs (replay_hash) WHERE replay_hash IS NOT NULL AND status = 'accepted'`);
  await soft(q`CREATE INDEX IF NOT EXISTS game_runs_board ON game_runs (game, status, submitted_at DESC, score DESC)`);
  await soft(q`CREATE INDEX IF NOT EXISTS game_runs_daily ON game_runs (game, daily, day, score DESC) WHERE status = 'accepted'`);
  await soft(q`CREATE TABLE IF NOT EXISTS agent_game_config (
    agent_id text PRIMARY KEY REFERENCES agents(id),
    brain_mode text NOT NULL DEFAULT 'builtin',
    byo_base text,
    byo_model text,
    byo_timeout int NOT NULL DEFAULT 4000,
    byo_protocol text NOT NULL DEFAULT 'openai',
    pilot_stage int NOT NULL DEFAULT 1,
    expert_unlocked boolean NOT NULL DEFAULT false,
    remind boolean NOT NULL DEFAULT false,
    remind_hour int NOT NULL DEFAULT 18,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await soft(q`CREATE TABLE IF NOT EXISTS agent_game_state (
    agent_id text NOT NULL REFERENCES agents(id),
    game text NOT NULL,
    state jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (agent_id, game)
  )`);
  await soft(q`CREATE TABLE IF NOT EXISTS agent_launches (
    token_address text PRIMARY KEY,
    chain text NOT NULL DEFAULT 'base',
    agent_id text NOT NULL,
    agent_handle text NOT NULL,
    beneficiary_handle text,
    fee_wallet text NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    status text NOT NULL,
    error text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  )`);
  await soft(q`CREATE INDEX IF NOT EXISTS agent_launches_agent_day ON agent_launches (agent_id, created_at DESC)`);
}
