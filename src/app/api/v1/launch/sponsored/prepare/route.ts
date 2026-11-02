import { NextResponse, type NextRequest } from "next/server";
import { isOwner } from "@/lib/auth/owner";
import { allow, ipOf } from "@/lib/rate";
import { buildSplit, CREATOR_BPS, TREASURY_BPS } from "@/lib/launch/sponsored-split";
import { newRunId, signTicket, sponsoredFlags, SPONSORED_CAPS, TICKET_TTL_MS, validateDraft } from "@/lib/launch/sponsored";

/** Owner-only: validate draft + 70/30 split → signed approval ticket. Never spends. */
export async function POST(req: NextRequest) {
  if (!isOwner(req)) return NextResponse.json({ ok: false, error: "owner_only" }, { status: 401 });
  if (!(await allow("sponsored", ipOf(req), 10, 1, "m"))) return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 }); }
  const f = sponsoredFlags();
  const { draft, problems } = validateDraft(body, f.treasury);
  if (!draft) return NextResponse.json({ ok: false, error: "invalid", problems }, { status: 400 });
  const split = f.treasury ? buildSplit(draft.feeRecipient, f.treasury) : [];
  const ticket = { ...draft, id: newRunId(), split, dryRun: !f.live, exp: Date.now() + TICKET_TTL_MS };
  const token = signTicket(ticket);
  if (!token) return NextResponse.json({ ok: false, error: "session_secret_unset" }, { status: 503 });
  return NextResponse.json({ ok: true, dryRun: ticket.dryRun, reason: f.reason, ticket: token, id: ticket.id, expiresAt: ticket.exp,
    plan: { chainId: 8453, provider: "bankr", split, bps: { creator: CREATOR_BPS, treasury: TREASURY_BPS }, caps: SPONSORED_CAPS, requiresHumanApproval: true } });
}
