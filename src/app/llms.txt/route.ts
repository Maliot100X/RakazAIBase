import { connection } from "next/server";
import { siteUrl } from "@/lib/agent/auth";

export async function GET() {
  await connection();
  const u = siteUrl();
  return new Response(`# Based Agents Terminal\n\n> Base (8453) + Farcaster agent terminal. Character: Rakaza. Sponsored 70/30 launches via Bankr (owner approval).\n\n- [Agent skill](${u}/skill.md)\n- [MCP](${u}/mcp): Streamable HTTP, Bearer\n- [OpenAPI](${u}/openapi.json)\n- [MCP manifest](${u}/.well-known/mcp.json)\n- [Agent card](${u}/.well-known/agent.json)\n- [API catalog](${u}/.well-known/api-catalog)\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
