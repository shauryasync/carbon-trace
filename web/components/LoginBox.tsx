"use client";
import { useState } from "react";
import { loginWithWallet, type CompanyProfile } from "@/lib/auth-client";
import { readableError } from "@/lib/contract";

// "Sign in with wallet" button. Asks for a company name only on a first login.
export default function LoginBox({ onLogin }: { onLogin: (c: CompanyProfile) => void }) {
  const [needsName, setNeedsName] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function go() {
    setBusy(true); setError("");
    try {
      onLogin(await loginWithWallet(name.trim() || undefined));
    } catch (e: any) {
      if (e.needsCompanyName) setNeedsName(true); // first login: show the name field
      else setError(readableError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md rounded-lg border border-stone-300 bg-white p-5">
      <p className="mb-3 text-sm text-stone-700">
        Sign in by signing a free message in MetaMask. No gas, no transaction.
      </p>
      {needsName && (
        <label className="mb-3 block text-sm">
          Company name
          <input className="mt-1 w-full rounded border border-stone-400 p-2" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Example Carbon Co" />
          <span className="text-xs text-stone-600">
            This name will be public and is self-declared (we do not verify it).
          </span>
        </label>
      )}
      <button onClick={go} disabled={busy}
        className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50">
        {busy ? "Waiting for MetaMask…" : "Sign in with wallet"}
      </button>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}
