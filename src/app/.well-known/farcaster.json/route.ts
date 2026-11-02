import { connection } from "next/server";
import { siteUrl } from "@/lib/agent/auth";
import { APP_NAME } from "@/lib/brand";
/** Farcaster Mini App manifest (miniapps.farcaster.xyz). accountAssociation from FARCASTER_HEADER/PAYLOAD/SIGNATURE; idle if unset. */
export async function GET() {
  await connection();
  const u = siteUrl(); const e = process.env;
  const assoc = e.FARCASTER_HEADER && e.FARCASTER_PAYLOAD && e.FARCASTER_SIGNATURE ? { header: e.FARCASTER_HEADER, payload: e.FARCASTER_PAYLOAD, signature: e.FARCASTER_SIGNATURE } : null;
  return Response.json({
    ...(assoc ? { accountAssociation: assoc } : { idle: true, reason: "NotConfigured: FARCASTER_HEADER/PAYLOAD/SIGNATURE" }),
    miniapp: { version: "1", name: APP_NAME, homeUrl: u, iconUrl: `${u}/favicon.ico`, requiredChains: ["eip155:8453"], primaryCategory: "finance" },
  }, { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, s-maxage=300" } });
}
