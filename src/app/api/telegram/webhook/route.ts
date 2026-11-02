import { after, connection, NextResponse } from "next/server";
import { handleUpdate, type Update } from "@/lib/telegram/bot";
import { secretOk } from "@/lib/telegram/secret";

export const maxDuration = 60;

export async function GET() {
  await connection();
  return NextResponse.json({ ok: true, configured: !!process.env.TELEGRAM_BOT_TOKEN, owner: !!process.env.TELEGRAM_ADMIN_ID });
}

export async function POST(req: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ ok: false, idle: true }, { status: 503 });
  if (!secretOk(req.headers.get("x-telegram-bot-api-secret-token"))) return NextResponse.json({ ok: false }, { status: 401 });
  let u: Update;
  try { u = (await req.json()) as Update; } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  if (typeof u?.update_id !== "number") return NextResponse.json({ ok: false }, { status: 400 });
  after(async () => { await handleUpdate(u); });
  return NextResponse.json({ ok: true });
}
