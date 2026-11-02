import { connection } from "next/server";
import { siteUrl } from "@/lib/agent/auth";
import { TOOLS } from "@/lib/agent/tools";

export async function GET() {
  await connection();
  const u = siteUrl();
  const md = `# Based Agents Terminal — agent skill (Rakaza)

Chain: **Base mainnet, chainId 8453**. Tokens are ERC-20 (0x addresses). Social: **Farcaster** (Neynar when configured).

## Connect
- MCP (Streamable HTTP, JSON-RPC POST): \`${u}/mcp\` with \`Authorization: Bearer <agent key>\`
- Discovery: \`${u}/.well-known/mcp.json\`, \`${u}/.well-known/agent.json\`, \`${u}/.well-known/api-catalog\`, \`${u}/.well-known/farcaster.json\`
- REST: \`${u}/api/v1/*\` (Bearer) and \`${u}/api/public/*\` (no auth). Spec: \`${u}/openapi.json\`. Summary: \`${u}/llms.txt\`

## Sponsored launch (70/30)
- Creator (feeRecipient) gets 70% of trading fees, platform treasury 30%. Provider: Bankr.
- Flow: \`launch_sponsored_guide\` → owner prepares/starts via \`/api/v1/launch/sponsored/*\` → \`launch_sponsored_status\`.
- Dry-run unless the owner enables execution. Agents never spend.

## Self-launch
- \`prepare_launch_package\` / \`simulate_launch\` are **dry-run only** (idle in this phase). Clanker is idle.

## Tools
${TOOLS.map((t) => `- \`${t.name}\` — ${t.description}`).join("\n")}

Tools that are not wired return \`{ "idle": true, "reason": "..." }\`.
`;
  return new Response(md, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, s-maxage=300" } });
}
