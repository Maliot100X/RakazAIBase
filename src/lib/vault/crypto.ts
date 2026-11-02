/** Browser vault crypto: AES-256-GCM, key from PBKDF2-SHA256 (310k rounds). Pure WebCrypto, works in browsers and Node 20+. */
export const PBKDF2_ROUNDS = 310_000;
export const MIN_PASSPHRASE = 8;

export interface Sealed {
  v: 1;
  salt: string;
  iv: string;
  data: string;
}
export interface VaultEntry {
  id: string;
  label: string;
  address: string;
  secret: string;
  createdAt: number;
}
export interface VaultDoc {
  entries: VaultEntry[];
}

const subtle = () => globalThis.crypto.subtle;
const b64 = (b: Uint8Array) => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const buf = (u: Uint8Array) => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer;

export function passphraseProblem(p: string): string | null {
  if (p.length < MIN_PASSPHRASE) return `Use at least ${MIN_PASSPHRASE} characters.`;
  return null;
}

async function deriveKey(pass: string, salt: Uint8Array, rounds = PBKDF2_ROUNDS) {
  const base = await subtle().importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", salt: buf(salt), iterations: rounds, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function seal(doc: VaultDoc, pass: string): Promise<Sealed> {
  const bad = passphraseProblem(pass);
  if (bad) throw new Error(bad);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pass, salt);
  const ct = await subtle().encrypt({ name: "AES-GCM", iv: buf(iv) }, key, new TextEncoder().encode(JSON.stringify(doc)));
  return { v: 1, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(ct)) };
}

export async function open(s: Sealed, pass: string): Promise<VaultDoc> {
  if (!s || s.v !== 1 || !s.salt || !s.iv || !s.data) throw new Error("This is not a Rakaza vault file.");
  try {
    const key = await deriveKey(pass, unb64(s.salt));
    const pt = await subtle().decrypt({ name: "AES-GCM", iv: buf(unb64(s.iv)) }, key, buf(unb64(s.data)));
    const doc = JSON.parse(new TextDecoder().decode(pt)) as VaultDoc;
    if (!Array.isArray(doc.entries)) throw new Error("bad");
    return doc;
  } catch {
    throw new Error("Wrong passphrase, or the vault data is damaged.");
  }
}

export function parseSealed(text: string): Sealed {
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const s = j as Sealed;
  if (!s || s.v !== 1 || typeof s.salt !== "string" || typeof s.iv !== "string" || typeof s.data !== "string") throw new Error("This is not a Rakaza vault file.");
  return s;
}

export function newEntry(label: string, address: string, secret: string): VaultEntry {
  return { id: globalThis.crypto.randomUUID(), label: label.trim() || "Untitled key", address, secret, createdAt: Date.now() };
}

/* ---- Base (secp256k1) additions ---- */
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

export const VAULT_STORAGE_KEY = "rakaza.base.vault.v1";
export const VAULT_INDEX_KEY = "rakaza.base.vault.index.v1";
export type VaultIndex = { id: string; label: string; address: string; createdAt: number }[];

/** Normalize + validate an EVM private key; returns address or throws. */
export function addressFromKey(raw: string): { key: `0x${string}`; address: string } {
  const k = (raw.trim().startsWith("0x") ? raw.trim() : `0x${raw.trim()}`) as `0x${string}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(k)) throw new Error("Private key must be 32 bytes hex.");
  return { key: k, address: privateKeyToAccount(k).address };
}
export function generateKey() {
  return addressFromKey(generatePrivateKey());
}

export function loadSealed(): Sealed | null {
  if (typeof localStorage === "undefined") return null;
  const t = localStorage.getItem(VAULT_STORAGE_KEY);
  try { return t ? parseSealed(t) : null; } catch { return null; }
}
export function loadIndex(): VaultIndex {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(VAULT_INDEX_KEY) || "[]") as VaultIndex; } catch { return []; }
}
/** Persist encrypted doc + a non-secret label/address index. Never sent to the server. */
export async function saveVault(doc: VaultDoc, pass: string) {
  const s = await seal(doc, pass);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(s));
  localStorage.setItem(VAULT_INDEX_KEY, JSON.stringify(doc.entries.map(({ id, label, address, createdAt }) => ({ id, label, address, createdAt }))));
  return s;
}
