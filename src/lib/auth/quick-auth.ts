import "server-only";
import { createClient } from "@farcaster/quick-auth";

let client: ReturnType<typeof createClient> | undefined;

/** Host of NEXT_PUBLIC_APP_URL, or null (Quick Auth idle). */
export function quickAuthDomain(): string | null {
  try { return new URL(process.env.NEXT_PUBLIC_APP_URL ?? "").host || null; } catch { return null; }
}

/** Verify a Farcaster Quick Auth JWT. Returns fid or null. */
export async function verifyQuickAuth(token: string): Promise<number | null> {
  const domain = quickAuthDomain();
  if (!domain || !token) return null;
  client ??= createClient();
  try {
    const p = await client.verifyJwt({ token, domain });
    const fid = Number(p.sub);
    return Number.isSafeInteger(fid) && fid > 0 ? fid : null;
  } catch { return null; }
}
