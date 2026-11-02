import { NextResponse } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { callTool } from "@/lib/agent/tools";
export const OPTIONS = preflight;
export async function POST(req: Request, ctx: { params: Promise<{ tool: string }> }) {
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: CORS });
  const { tool } = await ctx.params;
  const args = await req.json().catch(() => ({}));
  const r = await callTool(tool, args, a.caller);
  return NextResponse.json(r, { status: r.ok ? 200 : r.error === "unknown_tool" ? 404 : 400, headers: { ...CORS, ...NO_STORE } });
}
