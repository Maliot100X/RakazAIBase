import { NextResponse, type NextRequest } from "next/server";
import { integrations } from "@/lib/env";
import { allow, ipOf } from "@/lib/rate";
import { isOwner } from "@/lib/auth/owner";
import { BankrError, bankrPrompt } from "@/lib/clients/bankr";

/** Owner-only: submit a Bankr job, return jobId. Poll via /api/bankr/job/[id]. */
export async function POST(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ ok: false, error: "owner_only" }, { status: 401 });
  if (!integrations.bankr) return NextResponse.json({ ok: false, idle: true, error: "bankr_idle" }, { status: 503 });
  if (!(await allow("bankr", ipOf(req), 10, 1, "m"))) return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });
  let body: { prompt?: unknown; threadId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 2000) : "";
  if (!prompt) return NextResponse.json({ ok: false, error: "prompt_required" }, { status: 400 });
  const threadId = typeof body.threadId === "string" && body.threadId ? body.threadId : undefined;
  try {
    return NextResponse.json({ ok: true, ...(await bankrPrompt(prompt, threadId)) }, { status: 202 });
  } catch (e) {
    const status = e instanceof BankrError ? e.status : 502;
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "bankr error" }, { status });
  }
}
