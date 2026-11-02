import "server-only";
import { env, requireIntegration } from "@/lib/env";

/** Bankr Agent API (https://docs.bankr.bot/agent-api). Throws NotConfiguredError (503) when BANKR_API_KEY missing. */
const base = () => (env.BANKR_API_URL.trim() || "https://api.bankr.bot").replace(/\/+$/, "");

export type BankrJobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";
export type BankrSubmit = { jobId: string; threadId?: string; status: BankrJobStatus; message?: string };
export type BankrJob = {
  jobId: string;
  threadId?: string;
  status: BankrJobStatus;
  prompt?: string;
  response?: string;
  richData?: unknown[];
  error?: string;
  createdAt?: string;
  completedAt?: string;
};
export class BankrError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const STATUSES: BankrJobStatus[] = ["pending", "processing", "completed", "failed", "cancelled"];
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const statusOf = (v: unknown): BankrJobStatus => (STATUSES.includes(v as BankrJobStatus) ? (v as BankrJobStatus) : "pending");

export async function bankrFetch(path: string, init: RequestInit = {}) {
  requireIntegration("bankr");
  return fetch(`${base()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}), "X-API-Key": env.BANKR_API_KEY },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
}

async function json(r: Response): Promise<Record<string, unknown>> {
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new BankrError(r.status, str(j.message) ?? str(j.error) ?? `bankr ${r.status}`);
  return j;
}

export async function bankrPrompt(prompt: string, threadId?: string): Promise<BankrSubmit> {
  const j = await json(await bankrFetch("/agent/prompt", { method: "POST", body: JSON.stringify(threadId ? { prompt, threadId } : { prompt }) }));
  const jobId = str(j.jobId);
  if (!jobId) throw new BankrError(502, "bankr returned no jobId");
  return { jobId, threadId: str(j.threadId), status: statusOf(j.status), message: str(j.message) };
}

export async function bankrGetJob(jobId: string): Promise<BankrJob> {
  const j = await json(await bankrFetch(`/agent/job/${encodeURIComponent(jobId)}`));
  return {
    jobId: str(j.jobId) ?? jobId,
    threadId: str(j.threadId),
    status: statusOf(j.status),
    prompt: str(j.prompt),
    response: str(j.response),
    richData: Array.isArray(j.richData) ? j.richData : undefined,
    error: str(j.error),
    createdAt: str(j.createdAt),
    completedAt: str(j.completedAt),
  };
}

export const isTerminal = (s: BankrJobStatus) => s === "completed" || s === "failed" || s === "cancelled";

/** Poll every ~2s until terminal or timeout (docs: 2s interval, ~5 min budget). */
export async function bankrPollJob(jobId: string, { timeoutMs = 300_000, intervalMs = 2_000 } = {}): Promise<BankrJob> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    const job = await bankrGetJob(jobId);
    if (isTerminal(job.status)) return job;
    if (Date.now() + intervalMs > end) throw new BankrError(504, "bankr job timeout");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/** Honest status: "ready" only when BANKR_API_KEY is set. Never exposes the key. */
export function bankrStatus(): { status: "ready" | "idle"; baseUrl: string; reason: string | null } {
  const ready = env.BANKR_API_KEY.trim().length > 0;
  return { status: ready ? "ready" : "idle", baseUrl: base(), reason: ready ? null : "BANKR_API_KEY not set" };
}

/** Submit a read-only agent prompt and briefly poll. Returns pending jobId if not finished within waitMs. */
export async function bankrAgentPrompt(prompt: string, { waitMs = 20_000 } = {}): Promise<
  { ok: true; done: boolean; jobId: string; status: BankrJobStatus; response?: string; richData?: unknown[]; error?: string } | { ok: false; idle?: true; error: string }
> {
  if (bankrStatus().status !== "ready") return { ok: false, idle: true, error: "NotConfigured: bankr" };
  try {
    const sub = await bankrPrompt(prompt.slice(0, 2000));
    try {
      const job = await bankrPollJob(sub.jobId, { timeoutMs: waitMs });
      return { ok: true, done: true, jobId: job.jobId, status: job.status, response: job.response, richData: job.richData, error: job.error };
    } catch (e) {
      if (e instanceof BankrError && e.status === 504) return { ok: true, done: false, jobId: sub.jobId, status: sub.status };
      throw e;
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "bankr error" };
  }
}
