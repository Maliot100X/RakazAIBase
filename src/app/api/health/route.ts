import { NextResponse, connection } from "next/server";
import { integrationsHealth } from "@/lib/env";
import { CHAIN, CHAIN_ID } from "@/lib/chain";
import { sessionSecret } from "@/lib/auth/session";
import { upstashUrl } from "@/lib/upstash";
import { brainConfigured } from "@/lib/brain/provider";
import { defaultLaunchProvider } from "@/lib/launch/provider";


export async function GET() {
  await connection(); // evaluate env at request time, not build
  const status = integrationsHealth();
  const e = process.env;
  const configured = {
    database: !!e.DATABASE_URL,
    upstash: !!(upstashUrl() && e.UPSTASH_REDIS_REST_TOKEN),
    upstashReadOnly: !!(upstashUrl() && e.UPSTASH_REDIS_READONLY_TOKEN),
    session: !!sessionSecret(),
    quickAuth: !!e.NEXT_PUBLIC_APP_URL,
    brain: brainConfigured(),
    launchProvider: defaultLaunchProvider() ?? "idle",
  };
  return NextResponse.json({ ok: true, chain: CHAIN, chainId: CHAIN_ID, integrations: status, configured });
}
