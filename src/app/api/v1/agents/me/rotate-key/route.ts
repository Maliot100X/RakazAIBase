import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { rotateKey } from "@/lib/agents/service";

/** Rotate the DB agent's key. New secret returned once; only its hash is stored. Env bearers are not rotatable here. */
export const OPTIONS = preflight;
const H = { ...CORS, ...NO_STORE };
export async function POST(req: Request) {
  await connection();
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: H });
  if (a.caller.via !== "db") return NextResponse.json({ ok: false, error: "not_rotatable", message: "env bearer keys are managed via env, not this endpoint" }, { status: 400, headers: H });
  try {
    const r = await rotateKey(a.caller.id);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error, message: r.message }, { status: r.status, headers: H });
    return NextResponse.json({ ok: true, key: r.key, note: "Shown once; old key is now invalid." }, { headers: H });
  } catch { return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503, headers: H }); }
}
