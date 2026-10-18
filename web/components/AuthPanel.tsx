"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wallet, Loader2 } from "lucide-react";
import ProfileForm from "./ProfileForm";
import { Profile } from "./types";
import { setSession } from "./useSession";

const EMPTY: Profile = { displayName: "", organisation: "", role: "Project developer" };
const key = (addr: string) => `carbon-trace-profile:${addr.toLowerCase()}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getEth = () => (typeof window !== "undefined" ? (window as any).ethereum : undefined);

export default function AuthPanel({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [account, setAccount] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [noProfile, setNoProfile] = useState(false);

  async function connect() {
    setError("");
    setNoProfile(false);
    const eth = getEth();
    if (!eth) return setError("MetaMask not found. Install it from metamask.io.");
    setLoading(true);
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const addr = accounts[0];
      setAccount(addr);
      if (mode === "login") {
        if (localStorage.getItem(key(addr))) {
          setSession(addr);
          router.push("/register");
        } else setNoProfile(true);
      }
    } catch {
      setError("Connection cancelled.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md text-slate-900">
      <h1 className="text-2xl font-bold text-emerald-900">
        {mode === "signup" ? "Create your account" : "Log in"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-slate-600">
        Your MetaMask wallet is your login. There is no password.
      </p>

      {!account && (
        <button onClick={connect} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 py-2.5 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          Connect MetaMask
        </button>
      )}

      {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}

      {account && mode === "signup" && (
        <>
          <p className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Connected: <span className="font-mono">{account.slice(0, 6)}…{account.slice(-4)}</span>
          </p>
          <ProfileForm
            initial={EMPTY}
            onSave={(p) => {
              localStorage.setItem(key(account), JSON.stringify(p));
              setSession(account);
              router.push("/register");
            }}
          />
        </>
      )}

      {noProfile && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          No profile found for this wallet in this browser.{" "}
          <Link href="/signup" className="font-medium underline">Sign up first</Link>.
        </p>
      )}

      <p className="mt-6 text-xs text-slate-500">
        Prototype sign-in: profile details are self-declared, not verified, and saved only in this browser.
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