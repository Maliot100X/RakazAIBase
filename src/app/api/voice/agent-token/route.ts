import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { allow, ipOf } from "@/lib/rate";
import { AGENT_VOICE, AGENT_WS_URL } from "@/lib/voice/agent-settings";

const PROJECT = process.env.DEEPGRAM_PROJECT_ID || "1b2a5764-3b0f-424c-8db2-55b0075b6961";
const TTL = 120;

/** Short-lived Deepgram key (usage:write, 120s) for the browser Voice Agent call. Never returns the master key. */
export async function POST(req: NextRequest) {
  const key = env.DEEPGRAM_API_KEY;
  if (!key) return NextResponse.json({ error: "voice_not_configured" }, { status: 503 });
  if (!(await allow("agent-token", ipOf(req), 6, 1, "m"))) return NextResponse.json({ error: "slow_down" }, { status: 429 });
  const res = await fetch(`https://api.deepgram.com/v1/projects/${PROJECT}/keys`, {
    method: "POST",
    headers: { authorization: `Token ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ comment: "talk-yuri-call", scopes: ["usage:write"], time_to_live_in_seconds: TTL }),
    cache: "no-store",
  }).catch(() => null);
  const j = res?.ok ? ((await res.json().catch(() => null)) as { key?: string } | null) : null;
  if (!j?.key) return NextResponse.json({ error: "token_failed" }, { status: 502 });
  return NextResponse.json(
    { token: j.key, expiresAt: new Date(Date.now() + TTL * 1000).toISOString(), voice: AGENT_VOICE, wsUrl: AGENT_WS_URL },
    { headers: { "Cache-Control": "no-store" } },
  );
}
