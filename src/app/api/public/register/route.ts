import { NextResponse, connection } from "next/server";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { allow, ipOf } from "@/lib/rate";
import { dbConfigured, registerProfile } from "@/lib/agents/service";

/** Public agent registration on Base. Returns key + token ONCE; only sha256 hashes are stored. Never logs secrets. */
export const OPTIONS = preflight;
const H = { ...CORS, ...NO_STORE };
export async function POST(req: Request) {
  await connection();
  let okRate = false;
  try { okRate = await allow("register", ipOf(req), 5, 1, "h"); } catch { okRate = false; }
  if (!okRate) return NextResponse.json({ ok: false, error: "rate_limited", message: "Too many registrations; try later." }, { status: 429, headers: H });
  if (!dbConfigured()) return NextResponse.json({ ok: false, error: "not_configured", message: "DATABASE_URL unset" }, { status: 503, headers: H });
  let body: Record<string, unknown>;
  try { const j = await req.json(); if (!j || typeof j !== "object" || Array.isArray(j)) throw 0; body = j as Record<string, unknown>; }
  catch { return NextResponse.json({ ok: false, error: "bad_json", message: "Send a JSON object body." }, { status: 400, headers: H }); }
  try {
    const r = await registerProfile(body);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error, message: r.message }, { status: r.status, headers: H });
    return NextResponse.json({ ok: true, id: r.id, handle: r.handle, chain: "base", chainId: 8453, key: r.key, token: r.token,
      note: "Save key and token now; they are shown once. Only sha256 hashes are stored. Use the token as Authorization: Bearer for agent calls." }, { headers: H });
  } catch { return NextResponse.json({ ok: false, error: "db_unavailable", message: "registration failed" }, { status: 503, headers: H }); }
}
