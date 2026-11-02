import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** AES-256-GCM sealed blob (iv||tag||ciphertext), base64url. Ported from RakazaAiTerminal. */
const derive = (secret: string) => createHash("sha256").update(`mint-seal:${secret}`).digest();

export function sealBytes(bytes: Uint8Array, secret: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", derive(secret), iv);
  const enc = Buffer.concat([c.update(bytes), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
}

export function openBytes(sealed: string, secret: string): Uint8Array {
  const b = Buffer.from(sealed, "base64url");
  if (b.length < 29) throw new Error("Sealed value is malformed.");
  const d = createDecipheriv("aes-256-gcm", derive(secret), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return new Uint8Array(Buffer.concat([d.update(b.subarray(28)), d.final()]));
}

/** Prefer TREASURY_ENCRYPTION_KEY for Base vault/launch seals (never log the key). */
export function treasurySealSecret(): string | null {
  const k = (process.env.TREASURY_ENCRYPTION_KEY ?? "").trim();
  return k.length > 0 ? k : null;
}

export function sealWithTreasury(bytes: Uint8Array): string {
  const s = treasurySealSecret();
  if (!s) throw new Error("NotConfigured: TREASURY_ENCRYPTION_KEY");
  return sealBytes(bytes, s);
}

export function openWithTreasury(sealed: string): Uint8Array {
  const s = treasurySealSecret();
  if (!s) throw new Error("NotConfigured: TREASURY_ENCRYPTION_KEY");
  return openBytes(sealed, s);
}

export function sealUtf8WithTreasury(plain: string): string {
  return sealWithTreasury(new TextEncoder().encode(plain));
}

export function openUtf8WithTreasury(sealed: string): string {
  return new TextDecoder().decode(openWithTreasury(sealed));
}
