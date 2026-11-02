"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  addressFromKey, generateKey, loadSealed, newEntry, open, parseSealed, passphraseProblem, saveVault,
  VAULT_INDEX_KEY, VAULT_STORAGE_KEY, type Sealed, type VaultDoc,
} from "@/lib/vault/crypto";

const field = "w-full rounded border border-green-800 bg-black px-2 py-1 font-mono text-sm text-green-300";

/** Client-only encrypted key vault. Plaintext keys never leave this browser. */
export function KeyVaultTool() {
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [doc, setDoc] = useState<VaultDoc | null>(null);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [unlocked, setUnlocked] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState("");
  const [confirmErase, setConfirmErase] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSealed(loadSealed());
    setHydrated(true);
  }, []);

  const persist = async (next: VaultDoc, pw: string) => { setSealed(await saveVault(next, pw)); setDoc(next); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr(""); setMsg("");
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Something went wrong."); }
    setBusy(false);
  };

  const create = () => run(async () => {
    const bad = passphraseProblem(pass); if (bad) throw new Error(bad);
    if (pass !== pass2) throw new Error("The two passphrases do not match.");
    await persist({ entries: [] }, pass);
    setUnlocked(pass); setPass(""); setPass2("");
    setMsg("Vault created. No recovery without the passphrase — download a backup.");
  });
  const unlock = () => run(async () => { if (!sealed) return; setDoc(await open(sealed, pass)); setUnlocked(pass); setPass(""); });
  const lock = () => { setDoc(null); setUnlocked(""); setShown(null); setMsg("Locked."); };
  const importKey = () => run(async () => {
    if (!doc) return;
    const { key, address } = addressFromKey(secret);
    await persist({ entries: [...doc.entries, newEntry(label, address, key)] }, unlocked);
    setLabel(""); setSecret(""); setMsg(`Imported ${address}.`);
  });
  const generate = () => run(async () => {
    if (!doc) return;
    const { key, address } = generateKey();
    await persist({ entries: [...doc.entries, newEntry(label || "Generated " + address.slice(0, 6), address, key)] }, unlocked);
    setLabel(""); setMsg(`Generated ${address}.`);
  });
  const remove = (id: string) => run(async () => { if (doc) await persist({ entries: doc.entries.filter((e) => e.id !== id) }, unlocked); });
  const backup = () => {
    if (!sealed) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(sealed)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "rakaza-base-vault-backup.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const restore = (f: File | undefined) => run(async () => {
    if (!f) return;
    const s = parseSealed(await f.text());
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(s)); localStorage.removeItem(VAULT_INDEX_KEY);
    setSealed(s); setDoc(null); setUnlocked(""); setMsg("Backup loaded. Unlock to use it.");
  });
  const erase = () => {
    localStorage.removeItem(VAULT_STORAGE_KEY); localStorage.removeItem(VAULT_INDEX_KEY);
    setSealed(null); setDoc(null); setUnlocked(""); setConfirmErase(false); setMsg("Vault erased from this browser.");
  };

  if (!hydrated) return <p className="text-sm">Loading…</p>;
  return (
    <div className="grid w-full max-w-xl gap-4">
      <p className="text-xs text-muted-foreground">Browser vault: passphrase + WebCrypto (never sent to server). Server launch seals use TREASURY_ENCRYPTION_KEY via /api/vault/crypto.</p>
      {msg && <p role="status" className="text-sm">{msg}</p>}
      {err && <p role="alert" className="text-sm text-red-400">{err}</p>}
      {!sealed ? (
        <section className="grid gap-2 rounded border border-green-900 p-4">
          <h2>Create vault</h2>
          <input type="password" placeholder="Passphrase (8+)" className={field} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
          <input type="password" placeholder="Repeat passphrase" className={field} value={pass2} onChange={(e) => setPass2(e.target.value)} autoComplete="new-password" />
          <Button onClick={create} disabled={busy}>Create vault</Button>
        </section>
      ) : !doc ? (
        <section className="grid gap-2 rounded border border-green-900 p-4">
          <h2>Unlock</h2>
          <input type="password" placeholder="Passphrase" className={field} value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === "Enter" && unlock()} autoComplete="current-password" />
          <Button onClick={unlock} disabled={busy}>Unlock</Button>
        </section>
      ) : (
        <>
          <section className="grid gap-2 rounded border border-green-900 p-4">
            <h2>Keys ({doc.entries.length})</h2>
            {doc.entries.map((e) => (
              <div key={e.id} className="rounded border border-green-950 p-2">
                <p className="text-sm font-bold">{e.label}</p>
                <p className="break-all text-xs">{e.address}</p>
                {shown === e.id && <pre className="mt-1 break-all whitespace-pre-wrap text-xs text-yellow-300">{e.secret}</pre>}
                <div className="mt-1 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShown(shown === e.id ? null : e.id)}>{shown === e.id ? "Hide" : "Reveal / export"}</Button>
                  <Button size="sm" variant="outline" onClick={() => remove(e.id)} disabled={busy}>Delete</Button>
                </div>
              </div>
            ))}
          </section>
          <section className="grid gap-2 rounded border border-green-900 p-4">
            <h2>Import or generate (Base / EVM)</h2>
            <input placeholder="Label" className={field} value={label} onChange={(e) => setLabel(e.target.value)} />
            <input type="password" placeholder="0x… private key" className={field} value={secret} onChange={(e) => setSecret(e.target.value)} spellCheck={false} autoComplete="off" />
            <div className="flex gap-2">
              <Button onClick={importKey} disabled={busy || !secret}>Encrypt & import</Button>
              <Button variant="outline" onClick={generate} disabled={busy}>Generate new</Button>
            </div>
          </section>
          <Button variant="outline" onClick={lock}>Lock vault</Button>
        </>
      )}
      <section className="flex flex-wrap gap-2 rounded border border-green-900 p-4">
        <Button size="sm" onClick={backup} disabled={!sealed}>Download encrypted backup</Button>
        <label className="cursor-pointer rounded border border-green-800 px-2 py-1 text-sm">
          Restore file
          <input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { restore(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {!confirmErase
          ? <Button size="sm" variant="outline" onClick={() => setConfirmErase(true)} disabled={!sealed}>Erase…</Button>
          : <Button size="sm" variant="destructive" onClick={erase}>Yes, erase</Button>}
      </section>
    </div>
  );
}
