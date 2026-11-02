import "server-only";
import { env, requireIntegration } from "@/lib/env";

/** Pinata pinning with PINATA_JWT (Bearer). Legacy key/secret envs stay present but unused. */
const API = "https://api.pinata.cloud";
export const gateway = () => {
  const g = env.NEXT_PUBLIC_PINATA_GATEWAY.trim().replace(/\/+$/, "");
  if (!g) return "https://gateway.pinata.cloud/ipfs";
  const u = g.startsWith("http") ? g : `https://${g}`;
  return u.endsWith("/ipfs") ? u : `${u}/ipfs`;
};
export class PinataError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export type Pinned = { cid: string; uri: string; url: string };

async function pin(path: string, body: BodyInit, json: boolean): Promise<Pinned> {
  requireIntegration("pinata");
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.PINATA_JWT}`, ...(json ? { "Content-Type": "application/json" } : {}) },
    body,
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new PinataError(r.status === 401 || r.status === 403 ? 502 : r.status, `pinata ${r.status}`);
  const j = (await r.json()) as { IpfsHash?: unknown };
  if (typeof j.IpfsHash !== "string") throw new PinataError(502, "pinata returned no IpfsHash");
  return { cid: j.IpfsHash, uri: `ipfs://${j.IpfsHash}`, url: `${gateway()}/${j.IpfsHash}` };
}

export function pinJSON(content: Record<string, unknown>, name = "rakaza-metadata"): Promise<Pinned> {
  return pin("/pinning/pinJSONToIPFS", JSON.stringify({ pinataContent: content, pinataMetadata: { name } }), true);
}

export function pinFile(bytes: Uint8Array, filename: string, contentType: string): Promise<Pinned> {
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) throw new PinataError(400, "file must be 1 byte to 8 MB");
  const form = new FormData();
  form.append("file", new Blob([bytes as BlobPart], { type: contentType }), filename);
  form.append("pinataMetadata", JSON.stringify({ name: `rakaza-${filename}` }));
  return pin("/pinning/pinFileToIPFS", form, false);
}
