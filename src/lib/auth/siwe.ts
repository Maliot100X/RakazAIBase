import "server-only";
import { getAddress, verifyMessage, type Hex } from "viem";
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { redis } from "@/lib/upstash";
import { quickAuthDomain } from "@/lib/auth/quick-auth";

const TTL_S = 300;
const mem = new Map<string, number>();

export async function createNonce(): Promise<string> {
  const nonce = generateSiweNonce();
  const r = redis();
  if (r) await r.set(`siwe:nonce:${nonce}`, 1, { ex: TTL_S });
  else mem.set(nonce, Date.now() + TTL_S * 1000);
  return nonce;
}

/** One-shot nonce consume. */
async function consumeNonce(nonce: string): Promise<boolean> {
  const r = redis();
  if (r) return (await r.del(`siwe:nonce:${nonce}`)) === 1;
  const exp = mem.get(nonce);
  mem.delete(nonce);
  return !!exp && exp > Date.now();
}

/** Verify SIWE message+signature (EOA, Base chain). Returns checksummed address or null. */
export async function verifySiwe(message: string, signature: Hex): Promise<`0x${string}` | null> {
  const m = parseSiweMessage(message);
  if (!m.address || !m.nonce) return null;
  const domain = quickAuthDomain();
  if (!validateSiweMessage({ message: m, domain: domain ?? undefined })) return null;
  if (m.chainId !== undefined && m.chainId !== 8453) return null;
  if (!(await consumeNonce(m.nonce))) return null;
  const ok = await verifyMessage({ address: m.address, message, signature }).catch(() => false);
  return ok ? getAddress(m.address) : null;
}
