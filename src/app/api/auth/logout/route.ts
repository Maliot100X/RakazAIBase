import { NextResponse } from "next/server";
import { cookieOpts, SESSION_COOKIE } from "@/lib/auth/session";


export function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", cookieOpts(0));
  return res;
}
