import { connection } from "next/server";
import { siteUrl } from "@/lib/agent/auth";
/** RFC 9727 linkset. */
export async function GET() {
  await connection(); const u = siteUrl();
  return Response.json({ linkset: [
    { anchor: `${u}/api/v1`, "service-desc": [{ href: `${u}/openapi.json`, type: "application/openapi+json" }], "service-doc": [{ href: `${u}/skill.md`, type: "text/markdown" }] },
    { anchor: `${u}/mcp`, "service-desc": [{ href: `${u}/.well-known/mcp.json`, type: "application/json" }] },
  ] }, { headers: { "Content-Type": "application/linkset+json", "Access-Control-Allow-Origin": "*" } });
}
