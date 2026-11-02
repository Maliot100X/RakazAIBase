import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { readSession, SESSION_COOKIE, sessionSecret } from "@/lib/auth/session";


/** Owner session or `Authorization: Bearer CRON_SECRET`. Never runs at build. */
export async function POST(req: NextRequest) {
  if (!sql()) return NextResponse.json({ ok: false, idle: true }, { status: 503 });
  const cron = process.env.CRON_SECRET ?? "";
  const bearer = cron && req.headers.get("authorization") === `Bearer ${cron}`;
  const owner = readSession(req.cookies.get(SESSION_COOKIE)?.value, sessionSecret())?.r === "owner";
  if (!bearer && !owner) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  try { await ensureSchema(); return NextResponse.json({ ok: true }); }
  catch (e) { console.error("[db/ensure] migrate_failed:", e instanceof Error ? e.message : String(e)); return NextResponse.json({ ok: false, error: "migrate_failed" }, { status: 500 }); }
}
