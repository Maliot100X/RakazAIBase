import { NextResponse, type NextRequest } from "next/server";
import { isOwner } from "@/lib/auth/owner";
import { integrations } from "@/lib/env";
import { BankrError, bankrGetJob } from "@/lib/clients/bankr";
import { getRun } from "@/lib/launch/sponsored";

/** Owner-only: poll sponsored run (Upstash or memory fallback) and its Bankr job if submitted. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isOwner(req)) return NextResponse.json({ ok: false, error: "owner_only" }, { status: 401 });
  const { id } = await ctx.params;
  const { run, storage } = await getRun(id);
  if (!run) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  const h = { "Cache-Control": "no-store" };
  if (!run.bankrJobId || !integrations.bankr) return NextResponse.json({ ok: true, run, storage }, { headers: h });
  try { return NextResponse.json({ ok: true, run, storage, job: await bankrGetJob(run.bankrJobId) }, { headers: h }); }
  catch (e) { return NextResponse.json({ ok: false, run, storage, error: e instanceof Error ? e.message.slice(0, 200) : "bankr error" }, { status: e instanceof BankrError ? e.status : 502 }); }
}
