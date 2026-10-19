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
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

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
      <div className="mx-auto max-w-md text-slate-900">
        <h1 className="text-2xl font-bold text-emerald-900">You are signed in</h1>
        <p className="mb-6 mt-1 text-sm text-slate-600">
          {company.name} (self-declared) · <span className="font-mono">{short(company.address)}</span>
        </p>
        <div className="flex gap-3 text-sm">
          <Link href="/register" className="rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">Register a batch</Link>
          <Link href="/dashboard" className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-100">Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md text-slate-900">
      <h1 className="text-2xl font-bold text-emerald-900">
        {mode === "signup" ? "Create your account" : "Log in"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">
        Your MetaMask wallet is your login. There is no password. You sign a free message: no gas, no transaction.
      </p>

      {showName && (
        <label className="mb-4 block text-sm font-medium">
          Company name
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example Carbon Co"
            maxLength={80}
          />
          <span className="mt-1 block text-xs font-normal text-amber-700">
            Public and self-declared. We do not verify it.
          </span>
        </label>
      )}

      <button
        onClick={go}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
        {loading ? "Waiting for MetaMask…" : mode === "signup" ? "Connect MetaMask and sign up" : "Connect MetaMask and log in"}
      </button>

      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}

      <p className="mt-6 text-xs text-slate-500">
        Prototype sign-in: company names are self-declared and not verified. Login proves control of a wallet, not that the company is real.
      </p>
      <p className="mt-3 text-sm text-slate-600">
        {mode === "signup" ? (
          <>Already have a profile? <Link href="/login" className="text-emerald-700 underline">Log in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="text-emerald-700 underline">Sign up</Link></>
        )}
      </p>
    </div>
  );
}