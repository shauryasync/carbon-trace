"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf } from "lucide-react";
import WalletButton from "./WalletButton";

const links = [
  { href: "/register", label: "Register" },
  { href: "/verify", label: "Verify" },
];

export default function Navbar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-emerald-800">
          <Leaf className="h-5 w-5 text-emerald-600" />
          Carbon Registry
        </Link>
        <div className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-emerald-50 text-emerald-800"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}
                    <WalletButton />
        </div>
      </nav>
    </header>
  );
}