import { NextResponse, type NextRequest } from "next/server";
import { sessionSecret } from "@/lib/auth/session";
import { createNonce } from "@/lib/auth/siwe";
import { allow, ipOf } from "@/lib/rate";


export async function GET(req: NextRequest) {
  if (!sessionSecret()) return NextResponse.json({ ok: false, idle: true }, { status: 503 });
  if (!(await allow("siwe-nonce", ipOf(req), 20, 1, "m"))) return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });
  return NextResponse.json({ ok: true, nonce: await createNonce() }, { headers: { "Cache-Control": "no-store" } });
}
