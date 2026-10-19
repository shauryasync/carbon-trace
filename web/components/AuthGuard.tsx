"use client";
import type { ReactNode } from "react";
import { logout, type CompanyProfile } from "@/lib/auth-client";
import { useCompany } from "./useCompany";
import LoginBox from "./LoginBox";
import { short } from "./format";

// Wrap a page: loading -> login button -> your page (with a logout bar).
export default function AuthGuard({ children }: { children: ReactNode | ((c: CompanyProfile) => ReactNode) }) {
  const { company, setCompany, checked } = useCompany();

  if (!checked) return <p className="text-stone-600">Loading…</p>;
  if (!company) return <LoginBox onLogin={setCompany} />;

  const content = typeof children === "function" ? children(company) : children;

  return (
    <>
      <div className="mb-6 flex items-center justify-between rounded bg-stone-100 px-3 py-2 text-sm">
        <span>
          Signed in as <b>{company.name}</b> (self-declared) · {short(company.address)}
        </span>
        <button className="underline" onClick={async () => { await logout(); setCompany(null); }}>
          Log out
        </button>
      </div>
      {content}
    </>
  );
}
