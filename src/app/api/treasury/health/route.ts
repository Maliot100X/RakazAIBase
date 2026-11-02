import { NextResponse, connection } from "next/server";
import { createPublicClient, http, formatEther, isAddress, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { resolveBaseRpc } from "@/lib/rpc";



function treasuryAddress(): Address | null {
  const a = process.env.PLATFORM_TREASURY_ADDRESS?.trim();
  if (a && isAddress(a)) return a;
  const pk = process.env.PLATFORM_TREASURY_PRIVATE_KEY?.trim();
  if (pk) {
    try {
      return privateKeyToAccount((pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`).address;
    } catch { /* invalid key — idle */ }
  }
  return null;
}

export async function GET() {
  await connection(); // always dynamic (cacheComponents)
  const rpc = resolveBaseRpc();
  const address = treasuryAddress();
  const configured = { rpc: !!rpc, address: !!process.env.PLATFORM_TREASURY_ADDRESS, derivedFromKey: !process.env.PLATFORM_TREASURY_ADDRESS && !!address };
  if (!rpc || !address) return NextResponse.json({ ok: false, idle: true, chainId: 8453, configured }, { status: 503 });
  try {
    const client = createPublicClient({ chain: base, transport: http(rpc) });
    const [wei, block] = await Promise.all([client.getBalance({ address }), client.getBlockNumber()]);
    return NextResponse.json({ ok: true, chainId: 8453, address, wei: wei.toString(), eth: formatEther(wei), block: block.toString(), configured });
  } catch (e) {
    return NextResponse.json({ ok: false, chainId: 8453, address, error: e instanceof Error ? e.message.slice(0, 200) : "rpc error", configured }, { status: 502 });
  }
}
