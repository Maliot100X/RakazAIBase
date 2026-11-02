import { NextResponse, connection } from "next/server";
import { agentAuth, CORS, NO_STORE, preflight } from "@/lib/agent/auth";
import { quoteServiceFee } from "@/lib/launch/service-fee-quote";
import { quoteExactIn } from "@/lib/launch/quote";
export const OPTIONS = preflight;
const H = { ...CORS, ...NO_STORE };
const idle = () => NextResponse.json({ ok: false, idle: true, error: "quote_idle" }, { status: 503, headers: H });
/** GET: public dry summary (ethUsd + service fee + caps). */
export async function GET() {
  await connection();
  try { const q = await quoteServiceFee(); return NextResponse.json({ ok: true, preview: true, execute: false, ethUsd: q.ethUsd, source: q.ethUsdSource, serviceFee: q.quote, caps: q.caps }, { headers: H }); }
  catch { return idle(); }
}
const addr = (v: unknown): v is `0x${string}` => typeof v === "string" && /^0x[0-9a-fA-F]{40}$/.test(v);
/** POST: Uniswap exact-in quote (agentAuth). Idle 503 until routing is configured. */
export async function POST(req: Request) {
  await connection();
  const a = await agentAuth(req); if ("error" in a) return NextResponse.json({ ok: false, error: a.error }, { status: a.status, headers: CORS });
  let b: { tokenIn?: unknown; tokenOut?: unknown; amountInWei?: unknown };
  try { b = await req.json(); } catch { return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400, headers: H }); }
  let amt: bigint; try { amt = BigInt(String(b.amountInWei)); } catch { amt = BigInt(-1); }
  if (!addr(b.tokenIn) || !addr(b.tokenOut) || amt <= BigInt(0)) return NextResponse.json({ ok: false, error: "invalid_params" }, { status: 400, headers: H });
  try {
    const r = await quoteExactIn({ tokenIn: b.tokenIn, tokenOut: b.tokenOut, amountInWei: amt });
    if (!r.ok) return NextResponse.json({ ok: false, idle: true, error: r.error, reason: r.reason }, { status: 503, headers: H });
    return NextResponse.json({ ok: true, preview: true, execute: false, amountOutWei: r.amountOutWei.toString() }, { headers: H });
  } catch { return idle(); }
}
