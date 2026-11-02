import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { sql, ensureSchema } from "@/lib/db";

export const OPTIONS = preflight;
export async function GET(req: Request) {
  await connection();
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: CORS });
  const H = { ...CORS, ...NO_STORE };
  const q = sql();
  if (!q) return NextResponse.json({ ok: true, idle: true, reason: "NotConfigured: DATABASE_URL", tokens: [], chainId: 8453 }, { headers: H });
  try {
    await ensureSchema();
    const tokens = await q.query(
      `SELECT address, chain, name, symbol, uri, creator, provider, status, created_at FROM tokens WHERE NOT hidden AND chain = 'base' ORDER BY created_at DESC LIMIT 20`,
    );
    return NextResponse.json({ ok: true, tokens, chainId: 8453 }, { headers: H });
  } catch {
    return NextResponse.json({ ok: true, idle: true, reason: "tokens table unavailable; empty", tokens: [], chainId: 8453 }, { headers: H });
  }
}
