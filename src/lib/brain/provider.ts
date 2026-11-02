import "server-only";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { riverConfig } from "./river";

type P = { name: string; baseURL: string; apiKey: string; model: string; fetch?: typeof fetch };
const v = (k: string) => (process.env[k] ?? "").trim();

/** River-style fetch: per-attempt timeout + retries on 5xx/429/network errors (before any stream bytes). */
function retryingFetch(timeoutMs: number, attempts: number): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    let last: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const signal = init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs);
        const res = await fetch(input, { ...init, signal });
        if ((res.status >= 500 || res.status === 429) && i < attempts - 1) continue;
        return res;
      } catch (err) {
        last = err;
        if (init?.signal?.aborted) throw err;
      }
    }
    throw last instanceof Error ? last : new Error("brain request failed");
  }) as typeof fetch;
}

/**
 * Brain provider chain, first usable wins:
 * River -> OPENAI_* -> FREELLM_* -> Neon AI Gateway -> OpenRouter -> xAI. Empty slots are skipped (idle).
 */
export function resolveAll(): P[] {
  const out: P[] = [];
  const generic = v("LLM_MODEL") || v("RIVER_MODEL_PERSONA") || "auto";
  const r = riverConfig("persona");
  if (r) out.push({ name: "river", baseURL: r.baseURL, apiKey: r.apiKey, model: r.model, fetch: retryingFetch(25_000, 3) });
  if (v("OPENAI_BASE_URL") && v("OPENAI_API_KEY")) out.push({ name: "openai-compat", baseURL: v("OPENAI_BASE_URL"), apiKey: v("OPENAI_API_KEY"), model: generic });
  if (v("FREELLM_BASE_URL") && v("FREELLM_API_KEY")) out.push({ name: "freellm", baseURL: v("FREELLM_BASE_URL"), apiKey: v("FREELLM_API_KEY"), model: generic });
  if (v("NEON_AI_GATEWAY_BASE_URL") && v("NEON_AI_GATEWAY_TOKEN"))
    out.push({ name: "neon-gateway", baseURL: v("NEON_AI_GATEWAY_BASE_URL"), apiKey: v("NEON_AI_GATEWAY_TOKEN"), model: generic });
  if (v("OPENROUTER_API_KEY"))
    out.push({ name: "openrouter", baseURL: v("OPENROUTER_BASE_URL") || "https://openrouter.ai/api/v1", apiKey: v("OPENROUTER_API_KEY"), model: v("LLM_MODEL") || "openrouter/auto" });
  if (v("XAI_API_KEY")) out.push({ name: "xai", baseURL: v("XAI_BASE_URL") || "https://api.x.ai/v1", apiKey: v("XAI_API_KEY"), model: v("LLM_MODEL") || "grok-3-mini" });
  return out;
}

export const brainConfigured = (): boolean => resolveAll().length > 0;
export const brainProviderName = (): string | null => resolveAll()[0]?.name ?? null;

function modelFor(p: P) {
  return createOpenAICompatible({ name: p.name, baseURL: p.baseURL.replace(/\/+$/, ""), apiKey: p.apiKey, fetch: p.fetch }).chatModel(p.model);
}

/** First configured provider's model (streaming). Cross-provider fallback mid-stream is not attempted. */
export function getBrainModel() {
  const p = resolveAll()[0];
  return p ? modelFor(p) : null;
}

/** All configured models in chain order (for callers that want to retry on the next provider). */
export const getBrainModels = () => resolveAll().map((p) => ({ name: p.name, model: modelFor(p) }));
