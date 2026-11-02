import "server-only";
import type { NextRequest } from "next/server";
import { readSession, SESSION_COOKIE, sessionSecret } from "@/lib/auth/session";

export function isOwner(req: NextRequest): boolean {
  return readSession(req.cookies.get(SESSION_COOKIE)?.value, sessionSecret())?.r === "owner";
}
