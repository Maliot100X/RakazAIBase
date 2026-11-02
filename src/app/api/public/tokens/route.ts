import { NextResponse, connection } from "next/server";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { sql, ensureSchema } from "@/lib/db";

export const OPTIONS = preflight;
export async function GET() {
  await connection();
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
    return NextResponse.json({ ok: true, idle: true, reason: "tokens table unavailable on this database; empty", tokens: [], chainId: 8453 }, { headers: H });
  }
}
