"use client";
import Link from "next/link";
import { FilePlus2, SearchCheck } from "lucide-react";
import { useCompany } from "./useCompany";

export default function HeroButtons() {
  const { company, checked } = useCompany();

  return (
    <div className="mt-7 flex min-h-11 flex-wrap gap-3">
      {checked && (
        <>
          {company ? (
            <Link href="/register" className="flex min-h-11 items-center gap-2 rounded-lg bg-[#0B6B4F] px-5 py-2.5 font-semibold text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F]">
              <FilePlus2 className="h-5 w-5" /> Register a batch
            </Link>
          ) : (
            <Link href="/signup" className="flex min-h-11 items-center rounded-lg bg-[#0B6B4F] px-6 py-2.5 font-semibold text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F]">
              Get started
            </Link>
          )}
          <Link href="/verify" className="flex min-h-11 items-center gap-2 rounded-lg border border-[#E4E4DC] bg-white px-5 py-2.5 font-semibold text-[#0E1512] transition-colors hover:bg-[#F2F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F]">
            <SearchCheck className="h-5 w-5" /> Verify a serial
          </Link>
        </>
      )}
    </div>
  );
}