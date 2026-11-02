import "server-only";
import { CHAIN_ID } from "@/lib/chain";
import { integrations } from "@/lib/env";
import { executeEnabled } from "@/lib/launch/fees";
import { generateText } from "ai";
import { brainConfigured, getBrainModel } from "@/lib/brain/provider";
import { riverChat } from "@/lib/brain/river";
import { PERSONA } from "@/lib/brain/persona";
import { planSelfLaunch } from "@/lib/launch/self-launch";
import { sendText, tg } from "./api";
import { getKey, putKey, delKey } from "./pending";

/* Lean owner control room for RakazAIBase (Base 8453). Only the admin's private chat is served. No live execution. */

type Msg = { message_id: number; text?: string; chat: { id: number; type: string }; from?: { id: number } };
type Cb = { id: string; data?: string; from: { id: number }; message?: Msg };
export type Update = { update_id: number; message?: Msg; callback_query?: Cb };
export type QueueItem = { id: string; kind: string; note: string; at: number; status: "pending" | "approved_dry_run" };

export function adminId(): number | null {
  const n = Number(process.env.TELEGRAM_ADMIN_ID ?? "");
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const QTTL = 7 * 24 * 3600;
export async function listQueue(): Promise<QueueItem[]> { return (await getKey<QueueItem[]>("queue")) ?? []; }
async function saveQueue(q: QueueItem[]) { await putKey("queue", q.slice(-50), QTTL); }
export async function enqueue(kind: string, note: string): Promise<QueueItem> {
  const item: QueueItem = { id: Math.random().toString(36).slice(2, 8), kind, note: note.slice(0, 300), at: Date.now(), status: "pending" };
  await saveQueue([...(await listQueue()), item]);
  return item;
}

const HELP = `Rakaza Base control room (chain ${CHAIN_ID}). Owner only.

/status  switches and chain
/health  integration check (keys never shown)
/queue  pending owner approvals
/add <note>  add a dry-run item to the queue
/approve <id>  approve (dry-run, nothing executes)
/clear  empty the queue
/ask <text>  talk to the brain (plain text works too)
/launch  how the dry prepare path works
/prepare <Name> <TICKER>  dry self-launch plan (never executes)

Telegram never executes launches. EXECUTE stays off here.`;

const LAUNCH_HINT = `Launch prepare is dry-only from Telegram.
• App: open /launch in the web app to prepare and sign yourself.
• API: GET/POST /api/v1/launch/self/preview (dry plan + fee quote), or the sponsored guide.
• Here: /prepare <Name> <TICKER> returns a dry summary. No Bankr call, no Clanker deploy, no tx.`;

/** Short brain reply. Shares libs with /api/chat (no self-HTTP). Never leaks keys. */
async function brainReply(text: string): Promise<string> {
  const prompt = text.slice(0, 1000);
  const system = `${PERSONA}\nYou are replying to the owner in a private Telegram chat. Keep it short. You cannot execute launches from Telegram.`;
  try {
    if (brainConfigured()) {
      const model = getBrainModel();
      if (model) {
        const r = await generateText({ model, system, prompt, maxOutputTokens: 200, abortSignal: AbortSignal.timeout(25_000) });
        if (r.text.trim()) return r.text.trim();
      }
    }
  } catch (e) {
    console.error("[telegram] brain_failed:", e instanceof Error ? e.message.slice(0, 120) : "error");
  }
  const rv = await riverChat([{ role: "system", content: system }, { role: "user", content: prompt }], { maxTokens: 200, attempts: 2 }).catch(() => null);
  if (rv?.ok && rv.text.trim()) return rv.text.trim();
  if (!brainConfigured() && (!rv || !rv.ok)) return "Brain idle (no provider configured). Commands still work: /help";
  return "Brain error, try again shortly. /help";
}

async function prepare(chat: number, arg: string) {
  const parts = arg.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return sendText(chat, `${LAUNCH_HINT}\n\nUsage: /prepare <Name> <TICKER>`);
  const symbol = parts.pop()!;
  const p = await planSelfLaunch({ name: parts.join(" "), symbol });
  const lines = [
    `Dry prepare: ${p.input?.name ?? "?"} ($${p.input?.symbol ?? "?"})`,
    `ok: ${p.ok}${p.errors?.length ? ` (${p.errors.join("; ")})` : ""}`,
    `provider: ${p.provider ?? "none (idle)"}`,
    `fee quote: $${p.quote.usd} ≈ ${p.quote.eth} ETH (${p.quote.source})`,
    `dryRun: true, execute: false`,
    p.reason,
    `Nothing was sent. To track it: /add prepare ${p.input?.name ?? ""} ${p.input?.symbol ?? ""}`,
  ];
  return sendText(chat, lines.join("\n"));
}

async function status(): Promise<string> {
  const on = Object.entries(integrations).filter(([, v]) => v).map(([k]) => k);
  return `chain ${CHAIN_ID}\nEXECUTE_ENABLED=${executeEnabled()} (dry-run only from Telegram)\nqueue: ${(await listQueue()).filter((q) => q.status === "pending").length} pending\nintegrations on: ${on.join(", ") || "none"}`;
}

async function command(chat: number, text: string) {
  const [cmd0, ...rest] = text.trim().split(/\s+/);
  const cmd = cmd0.toLowerCase().replace(/@.*$/, "");
  const arg = rest.join(" ");
  switch (cmd) {
    case "/start": case "/help": return sendText(chat, HELP);
    case "/status": return sendText(chat, await status());
    case "/health": case "/ping": {
      const list = Object.entries(integrations).map(([k, v]) => `${v ? "✅" : "⚪"} ${k}`).join("\n");
      return sendText(chat, `pong\n${list}`);
    }
    case "/queue": {
      const q = await listQueue();
      if (!q.length) return sendText(chat, "Queue empty.");
      return sendText(chat, q.map((i) => `${i.id} [${i.status}] ${i.kind}: ${i.note}`).join("\n"),
        q.filter((i) => i.status === "pending").slice(0, 5).map((i) => [{ text: `Approve ${i.id}`, callback_data: `ap:${i.id}` }]));
    }
    case "/add": {
      if (!arg) return sendText(chat, "Usage: /add <note>");
      const i = await enqueue("note", arg);
      return sendText(chat, `Queued ${i.id} (dry-run; approve never executes).`);
    }
    case "/approve": return approve(chat, arg);
    case "/launch": return sendText(chat, LAUNCH_HINT);
    case "/prepare": return prepare(chat, arg);
    case "/ask": return sendText(chat, arg ? await brainReply(arg) : "Usage: /ask <text>");
    case "/clear": await delKey("queue"); return sendText(chat, "Queue cleared.");
    default: return sendText(chat, "Unknown command. /help");
  }
}

async function approve(chat: number, id: string) {
  const q = await listQueue();
  const i = q.find((x) => x.id === id.trim());
  if (!i) return sendText(chat, "No such item.");
  i.status = "approved_dry_run";
  await saveQueue(q);
  return sendText(chat, `Approved ${i.id} (dry-run). Nothing was executed — EXECUTE_ENABLED=${executeEnabled()}, Telegram never launches.`);
}

export async function handleUpdate(u: Update): Promise<void> {
  const admin = adminId();
  if (!admin) return;
  try {
    if (u.callback_query) {
      const c = u.callback_query;
      await tg("answerCallbackQuery", { callback_query_id: c.id });
      if (c.from.id !== admin || !c.message || c.message.chat.type !== "private") return;
      if (c.data?.startsWith("ap:")) await approve(c.message.chat.id, c.data.slice(3));
      return;
    }
    const m = u.message;
    if (!m?.text || m.from?.id !== admin || m.chat.type !== "private") return;
    if (m.text.startsWith("/")) await command(m.chat.id, m.text);
    else await sendText(m.chat.id, await brainReply(m.text));
  } catch (e) {
    console.error("[telegram] handler_failed:", e instanceof Error ? e.message : String(e));
  }
}
