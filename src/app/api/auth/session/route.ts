import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE, sessionSecret } from "@/lib/auth/session";


export function GET(req: NextRequest) {
  const secret = sessionSecret();
  if (!secret) return NextResponse.json({ ok: false, idle: true }, { status: 503 });
  const s = readSession(req.cookies.get(SESSION_COOKIE)?.value, secret);
  const body = s ? { ok: true, role: s.r, fid: s.fid, address: s.address } : { ok: false, role: null };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
