import { NextResponse, type NextRequest } from "next/server";
import { isOwner } from "@/lib/auth/owner";
import { CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { isEvmAddress } from "@/lib/launch/sponsored-split";
import { getRun, getRunByAddress, listRuns } from "@/lib/launch/sponsored";

export const OPTIONS = preflight;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Owner-only: run by id (UUID), by recorded Base token address (0x…), or `list` for recent runs. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ address: string }> }) {
  const h = { ...CORS, ...NO_STORE };
  if (!isOwner(req)) return NextResponse.json({ ok: false, error: "owner_only" }, { status: 401, headers: h });
  const { address } = await ctx.params;
  if (address === "list") { const r = await listRuns(20); return NextResponse.json({ ok: true, ...r }, { headers: h }); }
  const r = UUID.test(address) ? await getRun(address) : isEvmAddress(address) ? await getRunByAddress(address) : null;
  if (!r) return NextResponse.json({ ok: false, error: "bad_param", hint: "run id (uuid), 0x token address, or list" }, { status: 400, headers: h });
  if (!r.run) return NextResponse.json({ ok: false, error: "not_found", storage: r.storage }, { status: 404, headers: h });
  return NextResponse.json({ ok: true, run: r.run, storage: r.storage }, { headers: h });
}
