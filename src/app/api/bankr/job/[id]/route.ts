import { NextResponse, type NextRequest } from "next/server";
import { integrations } from "@/lib/env";
import { isOwner } from "@/lib/auth/owner";
import { BankrError, bankrGetJob } from "@/lib/clients/bankr";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isOwner(req)) return NextResponse.json({ ok: false, error: "owner_only" }, { status: 401 });
  if (!integrations.bankr) return NextResponse.json({ ok: false, idle: true, error: "bankr_idle" }, { status: 503 });
  const { id } = await ctx.params;
  try {
    return NextResponse.json({ ok: true, ...(await bankrGetJob(id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const status = e instanceof BankrError ? e.status : 502;
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message.slice(0, 200) : "bankr error" }, { status });
  }
}
