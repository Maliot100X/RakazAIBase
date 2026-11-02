import { NextResponse, type NextRequest } from "next/server";
import { tg } from "@/lib/telegram/api";
import { webhookSecret } from "@/lib/telegram/secret";
import { readSession, SESSION_COOKIE, sessionSecret } from "@/lib/auth/session";


/** Owner session or `Authorization: Bearer CRON_SECRET`. POST {"baseUrl":"https://domain"} sets the webhook; {"baseUrl":""} removes it. */
export async function POST(req: NextRequest) {
  const cron = process.env.CRON_SECRET ?? "";
  const bearer = !!cron && req.headers.get("authorization") === `Bearer ${cron}`;
  const owner = readSession(req.cookies.get(SESSION_COOKIE)?.value, sessionSecret())?.r === "owner";
  if (!bearer && !owner) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  if (!process.env.TELEGRAM_BOT_TOKEN) return NextResponse.json({ ok: false, idle: true }, { status: 503 });
  const { baseUrl } = (await req.json().catch(() => ({}))) as { baseUrl?: string };
  if (typeof baseUrl !== "string") return NextResponse.json({ error: "baseUrl_required" }, { status: 400 });
  if (baseUrl === "") return NextResponse.json(await tg("deleteWebhook", { drop_pending_updates: false }));
  if (!/^https:\/\/[^/\s]+$/.test(baseUrl)) return NextResponse.json({ error: "baseUrl must look like https://your-domain" }, { status: 400 });
  return NextResponse.json(await tg("setWebhook", { url: `${baseUrl}/api/telegram/webhook`, secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"], drop_pending_updates: true }));
}
