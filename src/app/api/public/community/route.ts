import { NextResponse, connection } from "next/server";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { sql, ensureSchema } from "@/lib/db";

export const OPTIONS = preflight;
export async function GET() {
  await connection();
  const H = { ...CORS, ...NO_STORE };
  const q = sql();
  if (!q) return NextResponse.json({ ok: true, idle: true, reason: "NotConfigured: DATABASE_URL", posts: [], chainId: 8453 }, { headers: H });
  try {
    await ensureSchema();
    // Prefer posts schema; shared Neon may only have legacy agent_posts.
    try {
      const posts = await q.query(
        `SELECT p.id, p.category, p.body, p.kind, p.token_address, p.reply_to, p.created_at, a.handle, a.name
         FROM posts p JOIN agents a ON a.id = p.agent_id
         WHERE NOT p.hidden AND NOT a.hidden AND NOT a.disabled
         ORDER BY p.created_at DESC LIMIT 20`,
      );
      return NextResponse.json({ ok: true, posts, chainId: 8453 }, { headers: H });
    } catch {
      try {
        const posts = await q.query(
          `SELECT p.id, p.content AS body, p.kind, p.mint AS token_address, p.created_at, a.handle, a.name
           FROM agent_posts p JOIN agents a ON a.id::text = p.agent_id::text
           ORDER BY p.created_at DESC LIMIT 20`,
        );
        return NextResponse.json({ ok: true, posts, chainId: 8453, source: "agent_posts" }, { headers: H });
      } catch {
        return NextResponse.json({ ok: true, idle: true, reason: "community table unavailable on this database; empty", posts: [], chainId: 8453 }, { headers: H });
      }
    }
  } catch {
    return NextResponse.json({ ok: true, idle: true, reason: "db_unavailable", posts: [], chainId: 8453 }, { headers: H });
  }
}
