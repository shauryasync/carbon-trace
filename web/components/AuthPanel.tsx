"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Loader2 } from "lucide-react";
import { loginWithWallet } from "@/lib/auth-client";
import { readableError } from "@/lib/contract";
import { useCompany } from "./useCompany";
import { short } from "./format";

const inputCls =
  "mt-1 min-h-11 w-full rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] px-3 py-2 text-[#0E1512] placeholder:text-[#5B6660] focus:border-[#0B6B4F] focus:outline-none focus:ring-2 focus:ring-[#0B6B4F]/20";

// Login and signup share one real flow: sign a free MetaMask message, and on a
// wallet's first login also send a company name. The server sets the cookie.
export default function AuthPanel({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const { company, setCompany, checked } = useCompany();
  const [name, setName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Signup always asks for the name; login asks only if the wallet is new.
  const showName = mode === "signup" || needsName;

  async function go() {
    setError("");
    const trimmed = name.trim();
    if (showName && (trimmed.length < 2 || trimmed.length > 80)) {
      return setError("Company name must be 2 to 80 characters.");
    }
    setLoading(true);
    try {
      const c = await loginWithWallet(showName ? trimmed : undefined);
      setCompany(c); // updates the navbar and every guarded page at once
      router.push("/register");
    } catch (e) {
      if ((e as { needsCompanyName?: boolean }).needsCompanyName) {
        setNeedsName(true);
        setError("This wallet is new here. Choose a company name to continue.");
      } else {
        setError(readableError(e));
      }
    } finally {
      setLoading(false);
    }
  }

  if (checked && company) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[#E4E4DC] bg-white p-6 text-[#0E1512] sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B6B4F]">Access authorization</p>
        <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">You are signed in</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-[#5B6660]">
          {company.name} (self-declared) · <span className="font-mono">{short(company.address)}</span>
        </p>
        <div className="flex gap-3 text-sm">
          <Link href="/register" className="flex min-h-11 items-center rounded-lg bg-[#0B6B4F] px-4 py-2 font-medium text-white transition-colors hover:bg-[#00513A]">Register a batch</Link>
          <Link href="/dashboard" className="flex min-h-11 items-center rounded-lg border border-[#E4E4DC] px-4 py-2 font-medium text-[#0E1512] transition-colors hover:bg-[#F2F2EC]">Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-lg rounded-xl border border-[#E4E4DC] bg-white p-6 text-[#0E1512] sm:p-8">
      <div className="mb-7 grid grid-cols-2 rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] p-1">
        <Link href="/login" aria-current={mode === "login" ? "page" : undefined} className={`rounded-md px-3 py-2.5 text-center text-sm font-medium transition-colors ${mode === "login" ? "bg-white text-[#0E1512] shadow-sm" : "text-[#5B6660] hover:text-[#0E1512]"}`}>Log in</Link>
        <Link href="/signup" aria-current={mode === "signup" ? "page" : undefined} className={`rounded-md px-3 py-2.5 text-center text-sm font-medium transition-colors ${mode === "signup" ? "bg-white text-[#0E1512] shadow-sm" : "text-[#5B6660] hover:text-[#0E1512]"}`}>Create account</Link>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B6B4F]">Access authorization</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight">
        {mode === "signup" ? "Create your account" : "Log in"}
      </h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-[#5B6660]">
        Your MetaMask wallet is your login. There is no password. You sign a free message: no gas, no transaction.
      </p>

      {showName && (
        <label className="mb-5 block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">
          Company name
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example Carbon Co"
            maxLength={80}
          />
          <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-[#8A6D1D]">
            Public and self-declared. We do not verify it.
          </span>
        </label>
      )}

      <button
        onClick={go}
        disabled={loading}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0B6B4F] px-4 py-3 font-medium text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F] disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        {loading ? "Waiting for MetaMask…" : mode === "signup" ? "Connect MetaMask and sign up" : "Connect MetaMask"}
      </button>

      {error && <p className="mt-3 rounded-md border border-[#B42318]/25 bg-[#FDECEA] p-3 text-sm text-[#B42318]" role="alert">{error}</p>}

      <p className="mt-5 border-t border-[#E4E4DC] pt-4 text-center text-xs leading-5 text-[#5B6660]">
        Prototype sign-in: company names are self-declared and not verified. Login proves control of a wallet, not that the company is real.
      </p>
      <p className="mt-4 text-sm text-[#5B6660]">
        {mode === "signup" ? (
          <>Already have a profile? <Link href="/login" className="font-medium text-[#0B6B4F] underline underline-offset-2">Log in</Link></>
        ) : (
          <>New to Carbon Registry? <Link href="/signup" className="font-medium text-[#0B6B4F] underline underline-offset-2">Sign up →</Link></>
        )}
      </p>
    </section>
  );
}