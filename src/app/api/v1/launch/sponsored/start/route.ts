import { NextResponse, type NextRequest } from "next/server";
import { isOwner } from "@/lib/auth/owner";
import { BankrError, bankrPrompt } from "@/lib/clients/bankr";
import { verifySplit } from "@/lib/launch/sponsored-split";
import { bankrLaunchPrompt, capOk, markUse, readTicket, setRun, sponsoredFlags } from "@/lib/launch/sponsored";

/** Owner-only: ticket + explicit approve:true → Bankr job. Idle/blocked unless EXECUTE_ENABLED && SPONSORED_ENABLED. */
export async function POST(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ ok: false, error: "owner_only" }, { status: 401 });
  let body: { ticket?: unknown; approve?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  const t = typeof body.ticket === "string" ? readTicket(body.ticket) : null;
  if (!t) return NextResponse.json({ ok: false, error: "ticket_invalid_or_expired" }, { status: 400 });
  if (body.approve !== true) return NextResponse.json({ ok: false, error: "human_approval_required" }, { status: 400 });
  const f = sponsoredFlags();
  if (!f.live || t.dryRun) {
    const storage = await setRun({ id: t.id, agentId: t.agentId, state: "idle", reason: f.reason ?? "dry_run_ticket", at: Date.now() });
    return NextResponse.json({ ok: true, idle: true, state: "idle", id: t.id, reason: f.reason ?? "dry_run_ticket", storage, note: "Dry-run: nothing sent, nothing spent." });
  }
  const v = verifySplit(t.split, f.treasury!);
  if (!v.ok) return NextResponse.json({ ok: false, error: "split_invalid", problems: v.problems }, { status: 400 });
  if (!(await capOk(t.agentId))) {
    const storage = await setRun({ id: t.id, agentId: t.agentId, state: "blocked", reason: "agent_cap", at: Date.now() });
    return NextResponse.json({ ok: false, state: "blocked", error: "agent_cap_reached", storage }, { status: 429 });
  }
  try {
    const job = await bankrPrompt(bankrLaunchPrompt(t));
    await markUse(t.agentId);
    const storage = await setRun({ id: t.id, agentId: t.agentId, state: "submitted", bankrJobId: job.jobId, at: Date.now() });
    return NextResponse.json({ ok: true, state: "submitted", id: t.id, jobId: job.jobId, storage }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "bankr error" }, { status: e instanceof BankrError ? e.status : 502 });
  }
}
