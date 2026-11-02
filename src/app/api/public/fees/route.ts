import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { callTool } from "@/lib/agent/tools";
export const OPTIONS = preflight;
export async function GET(req: Request) {
  await connection();
  void req; void agentAuth;
  return NextResponse.json((await callTool("platform_info", {})), { headers: { ...CORS, ...NO_STORE } });
}
