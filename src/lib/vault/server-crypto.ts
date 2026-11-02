import "server-only";
import { openUtf8WithTreasury, sealUtf8WithTreasury, treasurySealSecret } from "@/lib/launch/seal";

/** Server vault crypto — AES-256-GCM via launch/seal.ts + TREASURY_ENCRYPTION_KEY. */
export function treasuryCryptoConfigured(): boolean {
  return treasurySealSecret() !== null;
}

export function sealSecret(plain: string): string {
  return sealUtf8WithTreasury(plain);
}

export function openSecret(sealed: string): string {
  return openUtf8WithTreasury(sealed);
}

/** Self-check without exposing key material. */
export function cryptoRoundtripOk(): boolean {
  if (!treasuryCryptoConfigured()) return false;
  try {
    const probe = `rakaza-probe-${Date.now()}`;
    return openSecret(sealSecret(probe)) === probe;
  } catch {
    return false;
  }
}
