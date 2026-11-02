import { NextResponse } from "next/server";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { bankrStatus } from "@/lib/clients/bankr";
import { sponsoredFlags } from "@/lib/launch/sponsored";

/** Public: documents the Bankr agent flow for agents. No key, no network call. */
export const OPTIONS = preflight;
export async function GET() {
  const s = bankrStatus(); const f = sponsoredFlags();
  return NextResponse.json({
    ok: true, chainId: 8453, provider: "bankr", status: s.status, reason: s.reason,
    flow: [
      { step: "submit", method: "POST", path: "/api/bankr/prompt", auth: "owner session", body: { prompt: "string", threadId: "optional" }, returns: "202 { jobId }" },
      { step: "poll", method: "GET", path: "/api/bankr/job/{jobId}", auth: "owner session", note: "poll ~2s until completed|failed|cancelled" },
      { step: "agent tools", path: "/api/v1/tools", tools: ["bankr_status", "bankr_price", "bankr_quote"], auth: "Bearer agent token", note: "read-only prompts; never execute" },
      { step: "sponsored launch", path: "/api/v1/launch/sponsored/guide", note: "prepare -> owner approve -> Bankr job; live only when EXECUTE_ENABLED && SPONSORED_ENABLED" },
    ],
    sponsored: { live: f.live, reason: f.reason ?? null }, clanker: "idle (no live deploy)",
  }, { headers: { ...CORS, ...NO_STORE } });
}
