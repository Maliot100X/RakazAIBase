/** Rakaza sponsored split (product rule, not a Bankr API): 70% creator fee wallet / 30% treasury. Pure. */
export const CREATOR_BPS = 7000;
export const TREASURY_BPS = 3000;
export const TOTAL_BPS = 10000;
export type SplitShare = { address: string; shareBps: number; role: "creator" | "treasury" };
export const isEvmAddress = (a: unknown): a is `0x${string}` => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
const zero = /^0x0{40}$/i;

export function buildSplit(feeRecipient: string, treasury: string): SplitShare[] {
  return [{ address: feeRecipient, shareBps: CREATOR_BPS, role: "creator" }, { address: treasury, shareBps: TREASURY_BPS, role: "treasury" }];
}

/** Verifies 7000/3000, valid distinct addresses, fee recipient ≠ treasury. */
export function verifySplit(shares: SplitShare[], treasury: string): { ok: boolean; problems: string[] } {
  const p: string[] = [];
  if (shares.length !== 2) p.push(`expected 2 shares, got ${shares.length}`);
  const c = shares.find((s) => s.role === "creator"), t = shares.find((s) => s.role === "treasury");
  if (!c || c.shareBps !== CREATOR_BPS) p.push("creator must be 7000 bps");
  if (!t || t.shareBps !== TREASURY_BPS) p.push("treasury must be 3000 bps");
  if (shares.reduce((a, s) => a + s.shareBps, 0) !== TOTAL_BPS) p.push("shares must sum to 10000 bps");
  for (const s of shares) if (!isEvmAddress(s.address) || zero.test(s.address)) p.push(`invalid address ${s.address}`);
  if (c && c.address.toLowerCase() === treasury.toLowerCase()) p.push("fee recipient cannot be the treasury");
  if (t && t.address.toLowerCase() !== treasury.toLowerCase()) p.push("treasury share must go to PLATFORM_TREASURY_ADDRESS");
  return { ok: p.length === 0, problems: p };
}
