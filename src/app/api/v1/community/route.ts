import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { sql, ensureSchema } from "@/lib/db";

export const OPTIONS = preflight;
export async function GET(req: Request) {
  await connection();
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: CORS });
  const H = { ...CORS, ...NO_STORE };
  const q = sql();
  if (!q) return NextResponse.json({ ok: true, idle: true, reason: "NotConfigured: DATABASE_URL", posts: [], chainId: 8453 }, { headers: H });
  try {
    await ensureSchema();
    try {
      const posts = await q.query(
        `SELECT p.id, p.category, p.body, p.kind, p.token_address, p.reply_to, p.created_at, ag.handle, ag.name
         FROM posts p JOIN agents ag ON ag.id = p.agent_id
         WHERE NOT p.hidden AND NOT ag.hidden AND NOT ag.disabled
         ORDER BY p.created_at DESC LIMIT 20`,
      );
      return NextResponse.json({ ok: true, posts, chainId: 8453 }, { headers: H });
    } catch {
      try {
        const posts = await q.query(
          `SELECT p.id, p.content AS body, p.kind, p.mint AS token_address, p.created_at FROM agent_posts p ORDER BY p.created_at DESC LIMIT 20`,
        );
        return NextResponse.json({ ok: true, posts, chainId: 8453, source: "agent_posts" }, { headers: H });
      } catch {
        return NextResponse.json({ ok: true, idle: true, reason: "community table unavailable; empty", posts: [], chainId: 8453 }, { headers: H });
      }
    }
  } catch {
    return NextResponse.json({ ok: true, idle: true, reason: "db_unavailable", posts: [], chainId: 8453 }, { headers: H });
  }
}
