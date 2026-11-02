import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { feeTotals, listLedger } from "@/lib/launch/fees";
export const OPTIONS = preflight;
export async function GET(req: Request) {
  await connection();
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: CORS });
  return NextResponse.json({ ok: true, totals: await feeTotals(), ledger: await listLedger(50) }, { headers: { ...CORS, ...NO_STORE } });
}
