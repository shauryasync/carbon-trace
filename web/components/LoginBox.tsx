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
    <section className="mx-auto max-w-lg rounded-xl border border-[#E4E4DC] bg-white p-6 text-[#0E1512] sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B6B4F]">Access authorization</p>
      <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight">Sign in to Carbon Trace</h2>
      <p className="mb-5 mt-2 text-sm leading-6 text-[#5B6660]">
        Sign in by signing a free message in MetaMask. No gas, no transaction.
      </p>
      {needsName && (
        <label className="mb-4 block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">
          Company name
          <input className="mt-1 min-h-11 w-full rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] px-3 py-2 text-sm font-normal normal-case tracking-normal text-[#0E1512] focus:border-[#0B6B4F] focus:outline-none focus:ring-2 focus:ring-[#0B6B4F]/20" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="Example Carbon Co" />
          <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-[#8A6D1D]">
            This name will be public and is self-declared (we do not verify it).
          </span>
        </label>
      )}
      <button onClick={go} disabled={busy}
        className="min-h-11 w-full rounded-lg bg-[#0B6B4F] px-4 py-3 font-medium text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F] disabled:opacity-50">
        {busy ? "Waiting for MetaMask…" : "Sign in with wallet"}
      </button>
      {error && (
        <p className="mt-3 rounded-md border border-[#B42318]/25 bg-[#FDECEA] p-3 text-sm text-[#B42318]">
          {error}
          {error.startsWith("MetaMask not found") && (
            <>
              {" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-2"
              >
                Install MetaMask
              </a>
            </>
          )}
        </p>
      )}
      <p className="mt-5 border-t border-[#E4E4DC] pt-4 text-xs leading-5 text-[#5B6660]">
        Prototype sign-in: entity names are self-declared and not verified.
      </p>
    </section>
  );
}
