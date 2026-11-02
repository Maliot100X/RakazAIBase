import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { cookieOpts, SESSION_COOKIE, sessionSecret, signSession, type Session } from "@/lib/auth/session";
import { verifyQuickAuth } from "@/lib/auth/quick-auth";
import { verifySiwe } from "@/lib/auth/siwe";
import { allow, ipOf } from "@/lib/rate";


const d = (s: string) => createHash("sha256").update(s).digest();
const fail = (error: string, status: number) => NextResponse.json({ ok: false, error }, { status });
type Body = { type?: string; password?: string; token?: string; message?: string; signature?: string };

export async function POST(req: NextRequest) {
  const secret = sessionSecret();
  if (!secret) return NextResponse.json({ ok: false, idle: true }, { status: 503 });
  if (!(await allow("login", ipOf(req), 8, 10, "m"))) return fail("slow_down", 429);
  let b: Body = {};
  try {
    b = (req.headers.get("content-type") ?? "").includes("json")
      ? await req.json()
      : { password: String((await req.formData()).get("password") ?? "") };
  } catch {}

  let s: Omit<Session, "exp"> | null = null;
  if (b.type === "quickauth") {
    const fid = await verifyQuickAuth(String(b.token ?? ""));
    if (fid) s = { r: "fid", fid };
  } else if (b.type === "siwe") {
    const address = await verifySiwe(String(b.message ?? ""), String(b.signature ?? "") as `0x${string}`);
    if (address) s = { r: "address", address };
  } else {
    const pw = process.env.DASHBOARD_PASSWORD ?? "";
    if (!pw) return NextResponse.json({ ok: false, idle: true }, { status: 503 });
    if (b.password && timingSafeEqual(d(b.password), d(pw))) s = { r: "owner" };
  }
  if (!s) return fail("unauthorized", 401);

  const res = NextResponse.json({ ok: true, role: s.r, fid: s.fid, address: s.address });
  res.cookies.set(SESSION_COOKIE, signSession(secret, s), cookieOpts());
  res.headers.set("Cache-Control", "no-store");
  return res;
}
