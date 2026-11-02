import { NextResponse } from "next/server";
import { callTool, describeTool, TOOLS } from "@/lib/agent/tools";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";

/** Stateless MCP over Streamable HTTP (JSON replies), Bearer agent key. Base 8453. */
const SUPPORTED = ["2025-06-18", "2025-03-26"] as const;
const negotiate = (v: unknown) => ((SUPPORTED as readonly string[]).includes(String(v)) ? String(v) : SUPPORTED[0]);
const H = { ...CORS, ...NO_STORE };
type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const fail = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
export const OPTIONS = preflight;

export async function POST(req: Request) {
  const a = await agentAuth(req);
  if ("error" in a) return NextResponse.json(fail(null, -32001, a.error), { status: a.status, headers: { ...H, "WWW-Authenticate": "Bearer" } });
  let body: Rpc | Rpc[];
  try { body = (await req.json()) as Rpc | Rpc[]; } catch { return NextResponse.json(fail(null, -32700, "Parse error"), { status: 400, headers: H }); }
  const out: unknown[] = [];
  for (const m of Array.isArray(body) ? body : [body]) {
    if (m.id === undefined) continue;
    if (m.method === "initialize") out.push(ok(m.id, { protocolVersion: negotiate(m.params?.protocolVersion), capabilities: { tools: { listChanged: false } }, serverInfo: { name: "based-agents-terminal", title: "Based Agents Terminal (Rakaza)", version: "0.8.0" }, instructions: "Base (chainId 8453) + Farcaster tools. Read-only/dry-run: nothing moves money. Sponsored 70/30 launches need owner approval. Clanker idle." }));
    else if (m.method === "ping") out.push(ok(m.id, {}));
    else if (m.method === "tools/list") out.push(ok(m.id, { tools: TOOLS.map(describeTool) }));
    else if (m.method === "tools/call") {
      const r = await callTool(String(m.params?.name ?? ""), m.params?.arguments, a.caller);
      out.push(ok(m.id, r.ok ? { content: [{ type: "text", text: JSON.stringify(r.result) }], ...(r.result && typeof r.result === "object" && !Array.isArray(r.result) ? { structuredContent: r.result } : {}) } : { isError: true, content: [{ type: "text", text: `${r.error}: ${r.message}` }] }));
    } else out.push(fail(m.id, -32601, `Method not found: ${m.method}`));
  }
  if (!out.length) return new NextResponse(null, { status: 202, headers: H });
  return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: H });
}
export function GET() { return NextResponse.json({ error: "method_not_allowed", message: "POST JSON-RPC with Authorization: Bearer <agent key>." }, { status: 405, headers: { ...H, Allow: "POST, OPTIONS" } }); }
export const DELETE = GET;
