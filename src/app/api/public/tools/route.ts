import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { TOOLS, describeTool } from "@/lib/agent/tools";
export const OPTIONS = preflight;
export async function GET(req: Request) {
  await connection();
  void req; void agentAuth;
  return NextResponse.json({ ok: true, tools: TOOLS.filter((t) => t.public).map(describeTool) }, { headers: { ...CORS, ...NO_STORE } });
}
