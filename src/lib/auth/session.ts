import { createHmac, timingSafeEqual } from "node:crypto";

/** Signed session cookie: base64url(payload).hmac. Roles: owner (password), fid (Quick Auth), address (SIWE). */
export const SESSION_COOKIE = "rk_session";
export const SESSION_MAX_AGE_S = 60 * 60 * 12;
export type Role = "owner" | "fid" | "address";
export type Session = { r: Role; fid?: number; address?: `0x${string}`; exp: number };

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sig = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest();

export function sessionSecret(): string | null {
  const s = process.env.SESSION_SECRET ?? "";
  return s.length >= 32 ? s : null;
}

export function signSession(secret: string, data: Omit<Session, "exp">, now = Date.now()): string {
  const payload = b64(JSON.stringify({ ...data, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_S }));
  return `${payload}.${b64(sig(payload, secret))}`;
}

export function readSession(token: string | undefined, secret: string | null, now = Date.now()): Session | null {
  if (!token || !secret) return null;
  const [payload, mac] = token.split(".");
  if (!payload || !mac) return null;
  const want = sig(payload, secret);
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (!["owner", "fid", "address"].includes(p.r) || typeof p.exp !== "number" || p.exp * 1000 <= now) return null;
    return p;
  } catch { return null; }
}

export const cookieOpts = (maxAge = SESSION_MAX_AGE_S) =>
  ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge });
