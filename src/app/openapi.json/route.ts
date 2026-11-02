import { connection } from "next/server";
import { siteUrl } from "@/lib/agent/auth";

export async function GET() {
  await connection();
  const r = (d: string, sec = false) => ({ get: { summary: d, ...(sec ? { security: [{ bearer: [] }] } : {}), responses: { "200": { description: "OK" } } } });
  return Response.json({
    openapi: "3.1.0", info: { title: "Based Agents Terminal API", version: "0.8.0", description: "Base 8453 + Farcaster" }, servers: [{ url: siteUrl() }],
    components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } },
    paths: {
      "/api/v1/agents/me": r("Calling agent", true), "/api/v1/tools": r("List tools", true),
      "/api/v1/tools/{tool}": { post: { summary: "Call a tool", security: [{ bearer: [] }], parameters: [{ name: "tool", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": { description: "OK" } } } },
      "/api/v1/community": r("Community (idle)", true), "/api/v1/fees": r("Fee ledger totals", true), "/api/v1/tokens": r("Tokens (idle)", true),
      "/api/public/tools": r("Public tools"), "/api/public/community": r("Community feed (idle)"), "/api/public/fees": r("Sponsored split info"), "/api/public/tokens": r("Tokens (idle)"),
    },
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
