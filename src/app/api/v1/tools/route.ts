import { NextResponse } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { TOOLS, describeTool } from "@/lib/agent/tools";
export const OPTIONS = preflight;
export async function GET(req: Request) {
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: CORS });
  return NextResponse.json({ ok: true, chainId: 8453, tools: TOOLS.map(describeTool) }, { headers: { ...CORS, ...NO_STORE } });
}
