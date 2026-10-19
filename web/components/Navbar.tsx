"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Leaf, LogOut, ShoppingCart, Tag } from "lucide-react";
import { useSession, clearSession } from "./useSession";

const linkCls = "rounded-lg px-3 py-1.5 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800";

export default function Navbar() {
  const { address, ready, loggedIn } = useSession();
  const router = useRouter();

  return (
    <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-semibold text-emerald-800">
            <Leaf className="h-5 w-5" /> Carbon Registry
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            {ready && (
              <>
                <Link href="/buy" className={`flex items-center gap-1 ${linkCls}`}>
                  <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Buy
                </Link>
                <Link href="/sell" className={`flex items-center gap-1 ${linkCls}`}>
                  <Tag className="h-4 w-4" aria-hidden="true" /> Sell
                </Link>
              </>
            )}
            {ready && !loggedIn && (
              <>
                <Link href="/verify" className={linkCls}>Verify</Link>
                <Link href="/signup" className={linkCls}>Sign up</Link>
                <Link href="/login" className="rounded-lg bg-emerald-700 px-3 py-1.5 font-medium text-white hover:bg-emerald-800">Login</Link>
              </>
            )}
            {ready && loggedIn && address && (
              <>
                <Link href="/register" className={linkCls}>Register</Link>
                <Link href="/verify" className={linkCls}>Verify</Link>
                <span title={address} className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 font-medium text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-600" />
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
                <button
                  onClick={() => { clearSession(); router.push("/"); }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            )}
          </nav>
        </div>
    </header>
  );
}