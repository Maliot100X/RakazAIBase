import { NextResponse, type NextRequest } from "next/server";
import { integrations } from "@/lib/env";
import { allow, ipOf } from "@/lib/rate";
import { isOwner } from "@/lib/auth/owner";
import { PinataError, pinJSON } from "@/lib/clients/pinata";

const s = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** Owner-only: pin token metadata JSON → { cid, uri }. */
export async function POST(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ ok: false, error: "owner_only" }, { status: 401 });
  if (!integrations.pinata) return NextResponse.json({ ok: false, idle: true, error: "pinata_idle" }, { status: 503 });
  if (!(await allow("pinata", ipOf(req), 10, 1, "m"))) return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const name = s(b.name, 64), symbol = s(b.symbol, 16);
  if (!name || !symbol) return NextResponse.json({ ok: false, error: "name_symbol_required" }, { status: 400 });
  const meta: Record<string, unknown> = { name, symbol, description: s(b.description, 1000), image: s(b.image, 500) };
  for (const k of ["external_url", "website", "twitter", "telegram"]) if (s(b[k], 300)) meta[k] = s(b[k], 300);
  try {
    return NextResponse.json({ ok: true, ...(await pinJSON(meta, `rakaza-${symbol}`)) });
  } catch (e) {
    const status = e instanceof PinataError ? e.status : 502;
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "pinata error" }, { status });
  }
}
