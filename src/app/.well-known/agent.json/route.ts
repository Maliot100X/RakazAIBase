import { connection } from "next/server";
import { siteUrl } from "@/lib/agent/auth";
export async function GET() {
  await connection(); const u = siteUrl();
  return Response.json({
    name: "Rakaza", description: "Based Agents Terminal — Base 8453 + Farcaster agent platform.", url: u, version: "0.8.0", documentationUrl: `${u}/skill.md`,
    capabilities: { streaming: false, pushNotifications: false }, authentication: { schemes: ["bearer"] },
    interfaces: [{ type: "mcp", url: `${u}/mcp`, transport: "streamable-http" }, { type: "http", url: `${u}/api/v1/tools`, spec: `${u}/openapi.json` }, { type: "http-public", url: `${u}/api/public/tools`, spec: `${u}/openapi.json` }],
    skills: [
      { id: "sponsored-launch", name: "Sponsored 70/30 launch", description: "Guide and status for Bankr-sponsored ERC-20 launches on Base; owner approves." },
      { id: "fees", name: "Fee split", description: "Preview creator 70% / treasury 30% split." },
      { id: "farcaster", name: "Farcaster", description: "Farcaster lookups via Neynar (idle if unconfigured)." },
    ],
  }, { headers: { "Access-Control-Allow-Origin": "*" } });
}
