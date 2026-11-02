import { connection } from "next/server";
import { siteUrl } from "@/lib/agent/auth";
export async function GET() {
  await connection(); const u = siteUrl();
  return Response.json({ name: "based-agents-terminal", title: "Based Agents Terminal (Rakaza)", version: "0.8.0", chainId: 8453, transport: { type: "streamable-http", url: `${u}/mcp`, protocolVersions: ["2025-06-18", "2025-03-26"] }, authentication: { type: "bearer" }, documentation: `${u}/skill.md` }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
