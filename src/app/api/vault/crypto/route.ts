import { NextResponse, connection } from "next/server";
import { cryptoRoundtripOk, treasuryCryptoConfigured } from "@/lib/vault/server-crypto";

export async function GET() {
  await connection();
  const configured = treasuryCryptoConfigured();
  const roundtrip = configured ? cryptoRoundtripOk() : false;
  return NextResponse.json({
    ok: true,
    chainId: 8453,
    treasuryEncryption: configured ? "configured" : "idle",
    algorithm: "aes-256-gcm",
    format: "base64url(iv||tag||ciphertext)",
    roundtrip,
    note: "Client /keyvault stays passphrase+WebCrypto local. Server seals use TREASURY_ENCRYPTION_KEY.",
  });
}
