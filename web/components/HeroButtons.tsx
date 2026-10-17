"use client";
import Link from "next/link";
import { FilePlus2, SearchCheck } from "lucide-react";
import { useSession } from "./useSession";

export default function HeroButtons() {
  const { ready, loggedIn } = useSession();

  return (
    <div className="mt-8 flex min-h-[44px] flex-wrap gap-3">
      {ready && (
        <>
          {loggedIn ? (
            <Link href="/register" className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50">
              <FilePlus2 className="h-5 w-5" /> Register a batch
            </Link>
          ) : (
            <Link href="/signup" className="rounded-lg bg-white px-6 py-2.5 font-semibold text-emerald-800 hover:bg-emerald-50">
              Get started
            </Link>
          )}
          <Link href="/verify" className="flex items-center gap-2 rounded-lg border border-white/50 px-5 py-2.5 font-semibold text-white hover:bg-white/10">
            <SearchCheck className="h-5 w-5" /> Verify a serial
          </Link>
        </>
      )}
    </div>
  );
}