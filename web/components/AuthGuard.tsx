"use client";
import type { ReactNode } from "react";
import { logout, type CompanyProfile } from "@/lib/auth-client";
import { useCompany } from "./useCompany";
import LoginBox from "./LoginBox";
import { short } from "./format";

// Wrap a page: loading -> login button -> your page (with a logout bar).
export default function AuthGuard({ children }: { children: ReactNode | ((c: CompanyProfile) => ReactNode) }) {
  const { company, setCompany, checked } = useCompany();

  if (!checked) return <p className="mx-auto max-w-lg py-12 text-center text-sm text-[#5B6660]">Loading…</p>;
  if (!company) return <LoginBox onLogin={setCompany} />;

  const content = typeof children === "function" ? children(company) : children;

  return (
    <>
      <div className="mb-8 flex flex-col justify-between gap-2 border-y border-[#E4E4DC] bg-[#F2F2EC] px-4 py-3 text-xs text-[#3F4944] sm:flex-row sm:items-center">
        <span className="flex flex-wrap items-center gap-x-1.5">
          Signed in as <b className="text-[#0E1512]">{company.name}</b> <span className="text-[#5B6660]">(self-declared)</span> · <span className="font-mono">{short(company.address)}</span>
        </span>
        <button className="w-fit font-semibold text-[#0B6B4F] underline underline-offset-2" onClick={async () => { await logout(); setCompany(null); }}>
          Log out
        </button>
      </div>
      {content}
    </>
  );
}
