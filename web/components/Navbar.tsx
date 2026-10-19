"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu, ShoppingCart, Tag, X } from "lucide-react";
import { logout } from "@/lib/auth-client";
import { useCompany } from "./useCompany";
import { short } from "./format";

const linkCls = "rounded-md px-3 py-2 text-sm text-[#3F4944] transition-colors hover:bg-[#F2F2EC] hover:text-[#0B6B4F]";

export default function Navbar() {
  const { company, setCompany, checked } = useCompany();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-[#E4E4DC] bg-white">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight text-[#0E1512]">
          <span aria-hidden="true" className="h-7 w-7 shrink-0 bg-[url('/carbon-registry-mark.svg')] bg-contain bg-center bg-no-repeat" />
          Carbon Registry
        </Link>
        <button
          type="button"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-md border border-[#E4E4DC] text-[#3F4944] transition-colors hover:bg-[#F2F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F] md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
        <nav
          id="primary-navigation"
          className={`${menuOpen ? "flex" : "hidden"} w-full flex-col items-stretch gap-1 border-t border-[#E4E4DC] pt-3 text-sm md:flex md:w-auto md:flex-row md:items-center md:gap-1 md:border-0 md:pt-0`}
        >
          {checked && (
            <>
              <Link href="/buy" onClick={() => setMenuOpen(false)} className={`flex min-h-11 items-center gap-1 ${linkCls}`}>
                <ShoppingCart className="h-4 w-4" aria-hidden="true" /> Buy
              </Link>
              <Link href="/sell" onClick={() => setMenuOpen(false)} className={`flex min-h-11 items-center gap-1 ${linkCls}`}>
                <Tag className="h-4 w-4" aria-hidden="true" /> Sell
              </Link>
            </>
          )}
          {checked && !company && (
            <>
              <Link href="/verify" onClick={() => setMenuOpen(false)} className={`${linkCls} flex min-h-11 items-center`}>Verify</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className={`${linkCls} flex min-h-11 items-center`}>Sign up</Link>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center rounded-lg bg-[#0B6B4F] px-3 py-2 font-medium text-white transition-colors hover:bg-[#00513A]">Login</Link>
            </>
          )}
          {checked && company && (
            <>
              <Link href="/register" onClick={() => setMenuOpen(false)} className={`${linkCls} flex min-h-11 items-center`}>Register</Link>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className={`${linkCls} flex min-h-11 items-center`}>Dashboard</Link>
              <Link href="/verify" onClick={() => setMenuOpen(false)} className={`${linkCls} flex min-h-11 items-center`}>Verify</Link>
              <span title={company.address} className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 font-medium text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                <span className="hidden sm:inline">{company.name}</span>
                <span className="hidden text-[10px] font-normal text-[#5B6660] sm:inline">(self-declared)</span>
                <span className="font-mono text-xs font-normal">{short(company.address)}</span>
              </span>
              <button
                onClick={async () => { await logout(); setCompany(null); setMenuOpen(false); router.push("/"); }}
                className="flex min-h-10 items-center gap-1 rounded-md border border-[#E4E4DC] px-3 py-2 text-xs font-semibold uppercase tracking-wider text-[#3F4944] transition-colors hover:bg-[#F2F2EC]"
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