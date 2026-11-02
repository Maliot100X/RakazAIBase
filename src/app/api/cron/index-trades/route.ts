import { connection, NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/launch/cron-auth";
import { qstashConfigured } from "@/lib/launch/fees";
import { sql } from "@/lib/db";
/** Trade indexer tick (Base). Phase 7: reports cursor state only; log ingestion is a HOLD. */
async function handle(req: Request) {
  await connection();
  if (!cronAuthorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!qstashConfigured()) return NextResponse.json({ ok: true, idle: true, reason: "QSTASH_TOKEN not set" });
  const q = sql();
  if (!q) return NextResponse.json({ ok: true, idle: true, reason: "DATABASE_URL not set" });
  try {
    const r = (await q`SELECT count(*)::int AS n FROM index_cursor`) as { n: number }[];
    return NextResponse.json({ ok: true, dryRun: true, cursors: r[0]?.n ?? 0, indexed: 0 });
  } catch (e) { return NextResponse.json({ ok: true, idle: true, reason: (e as Error).message }); }
}
export const GET = handle;
export const POST = handle;
