import "server-only";

/** Thin Telegram Bot API client. The token is read from the environment and never logged. */
const token = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
const url = (m: string) => `https://api.telegram.org/bot${token()}/${m}`;

export type Button = { text: string; callback_data: string };

/**
 * Mock mode for tests: with TELEGRAM_MOCK=1 nothing leaves the machine. Every outbound call is recorded in
 * `globalThis.__tgOutbox` instead of going to Telegram (text, photo, voice and button calls alike).
 */
export type Outbound = { method: string; body?: Record<string, unknown> };
export const isMock = () => process.env.TELEGRAM_MOCK === "1";
function record(o: Outbound) {
  const g = globalThis as unknown as { __tgOutbox?: Outbound[] };
  (g.__tgOutbox ??= []).push(o);
}

export async function tg(method: string, body?: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  if (isMock()) { record({ method, body }); return { ok: true, result: {} }; }
  try {
    const res = await fetch(url(method), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(30_000), cache: "no-store" });
    return (await res.json()) as { ok: boolean; result?: unknown; description?: string };
  } catch {
    return { ok: false, description: "Could not reach Telegram." };
  }
}

export async function sendText(chat: number, text: string, buttons?: Button[][]) {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += 3800) chunks.push(text.slice(i, i + 3800));
  for (let i = 0; i < chunks.length; i++) {
    await tg("sendMessage", { chat_id: chat, text: chunks[i], disable_web_page_preview: true, ...(buttons && i === chunks.length - 1 ? { reply_markup: { inline_keyboard: buttons } } : {}) });
  }
}

