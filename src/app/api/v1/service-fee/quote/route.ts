import { NextResponse, connection } from "next/server";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { quoteServiceFee } from "@/lib/launch/service-fee-quote";
export const OPTIONS = preflight;
/** Public dry-read: preview service-fee quote. No auth needed (read-only, no secrets, execute:false). */
export async function GET() {
  await connection();
  try { return NextResponse.json(await quoteServiceFee(), { headers: { ...CORS, ...NO_STORE } }); }
  catch { return NextResponse.json({ ok: false, idle: true, error: "quote_idle" }, { status: 503, headers: { ...CORS, ...NO_STORE } }); }
}
