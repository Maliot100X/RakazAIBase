import { NextResponse } from "next/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { allow, ipOf } from "@/lib/rate";
import { brainConfigured, brainProviderName, getBrainModel, resolveAll } from "@/lib/brain/provider";
import { integrationsHealth } from "@/lib/env";
import { ADULT_ADDENDUM, ADULT_MINOR_REPLY, PERSONA, parseCommand, touchesMinors } from "@/lib/brain/persona";

export const maxDuration = 30;

function runtimeContext(): string {
  const h = integrationsHealth() as Record<string, string>;
  const configured = new Set(resolveAll().map((p) => p.name));
  const brains = ["river", "openai-compat", "freellm", "neon-gateway", "openrouter", "xai"]
    .map((n) => `${n}=${configured.has(n) ? "configured" : "idle"}`).join(", ");
  return `Runtime status (live, from server config; no prices known):
- Brain answering now: ${brainProviderName() ?? "none"}. Chain: ${brains}.
- EXECUTE: ${h.execute} (${h.execute === "enabled" ? "real payouts possible" : "distribution is dry run only"}). Sponsored launches: ${h.sponsored}.
- Bankr: ${h.bankr}. Clanker: ${h.clanker}. Deepgram voice: ${h.deepgram}. Telegram owner: ${h.telegramOwner}. Farcaster manifest: ${h.farcasterManifest}.`;
}

const textOf = (m: UIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

export async function POST(req: Request) {
  if (!brainConfigured()) return NextResponse.json({ ok: false, idle: true, error: "brain_idle" }, { status: 503 });
  if (!(await allow("chat", ipOf(req), 20, 1, "m")))
    return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });

  let body: { messages?: unknown; adult?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0)
    return NextResponse.json({ ok: false, error: "messages_required" }, { status: 400 });
  const messages = (body.messages as UIMessage[])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && Array.isArray(m.parts))
    .slice(-12);
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") return NextResponse.json({ ok: false, error: "last_message_must_be_user" }, { status: 400 });
  const lastText = textOf(last).slice(0, 500);

  const adult = body.adult === true;
  if (adult && messages.some((m) => m.role === "user" && touchesMinors(textOf(m)))) {
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "text-start", id: "t" });
        writer.write({ type: "text-delta", id: "t", delta: ADULT_MINOR_REPLY });
        writer.write({ type: "text-end", id: "t" });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }

  const command = parseCommand(lastText);
  const result = streamText({
    model: getBrainModel()!,
    instructions: (adult ? PERSONA + "\n" + ADULT_ADDENDUM : PERSONA) + "\n\n" + runtimeContext(),
    messages: await convertToModelMessages(messages),
    maxOutputTokens: command === "sing" || command === "story" ? 220 : 140,
  });
  return createUIMessageStreamResponse({
    headers: { "Cache-Control": "no-store" },
    stream: toUIMessageStream({ stream: result.stream, onError: () => "My brain didn't answer. Try again in a moment." }),
  });
}
