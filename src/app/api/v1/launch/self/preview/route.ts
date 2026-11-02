import { NextResponse, connection, type NextRequest } from "next/server";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { planSelfLaunch } from "@/lib/launch/self-launch";
import { recordLedgerEvent } from "@/lib/launch/fees";

export const OPTIONS = preflight;
/** Public dry self-launch preview (Base). No secrets, no signing, no sending. */
async function respond(input: Record<string, unknown>, record: boolean) {
  const plan = await planSelfLaunch(input);
  if (record && plan.ok) await recordLedgerEvent({ kind: "launch_preview_dry", tokenAddress: null, amountWei: plan.quote.wei, meta: { provider: plan.provider, symbol: plan.input?.symbol } });
  return NextResponse.json(plan, { status: plan.ok ? 200 : 400, headers: { ...CORS, ...NO_STORE } });
}
export async function GET(req: NextRequest) {
  await connection();
  const u = req.nextUrl.searchParams;
  return respond({ name: u.get("name") ?? "Preview Token", symbol: u.get("symbol") ?? "PRVW", image: u.get("image") ?? undefined, admin: u.get("admin") ?? undefined }, false);
}
export async function POST(req: NextRequest) {
  await connection();
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  return respond(body && typeof body === "object" ? body : {}, true);
}
