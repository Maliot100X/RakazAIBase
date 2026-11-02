import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { agentById } from "@/lib/agents/service";

export const OPTIONS = preflight;
export async function GET(req: Request) {
  await connection();
  const H = { ...CORS, ...NO_STORE };
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: H });
  if (a.caller.via !== "db") return NextResponse.json({ ok: true, agent: { kind: "agent", handle: "env", via: a.caller.via, synthetic: true }, chainId: 8453 }, { headers: H });
  try {
    const p = await agentById(a.caller.id);
    if (!p) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: H });
    return NextResponse.json({ ok: true, agent: { ...p, via: "db", cred: a.caller.cred }, chainId: 8453 }, { headers: H });
  } catch { return NextResponse.json({ ok: false, error: "db_unavailable" }, { status: 503, headers: H }); }
}
