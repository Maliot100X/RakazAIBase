import "server-only";

export type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
export const PERSONA_MODEL_DEFAULT = "deepseek-ai/DeepSeek-V4.1-Flash";
type Opts = { key?: "persona" | "agent"; model?: string; maxTokens?: number; temperature?: number; timeoutMs?: number; attempts?: number };

const v = (k: string) => (process.env[k] ?? "").trim();

/** River config; null (idle) when RIVER_BASE_URL or both keys are empty. */
export function riverConfig(key: "persona" | "agent" = "persona") {
  const baseURL = v("RIVER_BASE_URL").replace(/\/+$/, "");
  const apiKey = key === "agent" ? v("RIVER_AGENT") || v("RIVER_RAKAZO") : v("RIVER_RAKAZO") || v("RIVER_AGENT");
  if (!baseURL || !apiKey) return null;
  const model = (key === "agent" ? v("RIVER_MODEL_AGENT") : v("RIVER_MODEL_PERSONA")) || PERSONA_MODEL_DEFAULT;
  return { baseURL, apiKey, model };
}

/** Non-stream OpenAI-compatible call to River with timeout and retries (River sometimes times out once). */
export async function riverChat(messages: ChatMsg[], opts: Opts = {}): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const c = riverConfig(opts.key ?? "persona");
  if (!c) return { ok: false, error: "River is not configured on the server." };
  const model = opts.model ?? c.model;
  let lastErr = "unknown error";
  for (let attempt = 0; attempt < Math.max(1, opts.attempts ?? 3); attempt++) {
    try {
      const res = await fetch(`${c.baseURL}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${c.apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, messages, max_tokens: opts.maxTokens ?? 300, temperature: opts.temperature ?? 0.8 }),
        signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
        cache: "no-store",
      });
      if (!res.ok) {
        lastErr = `River returned ${res.status}`;
        if (res.status < 500 && res.status !== 429) break;
        continue;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = data.choices?.[0]?.message?.content?.trim();
      if (text) return { ok: true, text, model };
      lastErr = "River returned an empty reply";
    } catch (err) {
      lastErr = err instanceof Error ? err.message : "request failed";
    }
  }
  return { ok: false, error: lastErr };
}
