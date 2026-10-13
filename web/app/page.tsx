import Link from "next/link";
import { FilePlus2, SearchCheck, ShieldCheck, ShieldOff } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 px-8 py-14 text-white">
        <h1 className="max-w-2xl text-3xl font-bold leading-tight sm:text-4xl">
          One carbon credit. One record. Counted once.
        </h1>
        <p className="mt-4 max-w-2xl text-emerald-50">
          A public registry that makes credit records unique, tamper-proof and traceable, and shows
          who vouched for them.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            <FilePlus2 className="h-4 w-4" /> Register a batch
          </Link>
          <Link href="/verify" className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10">
            <SearchCheck className="h-4 w-4" /> Verify a serial
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h2 className="mt-3 font-semibold">What it does</h2>
          <p className="mt-1 text-sm text-slate-600">
            Blocks the same serial range from being registered twice for a project, anchors an
            evidence fingerprint on-chain, and shows which approved auditor attested a batch.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <ShieldOff className="h-6 w-6 text-slate-500" />
          <h2 className="mt-3 font-semibold">What it does not do</h2>
          <p className="mt-1 text-sm text-slate-600">
            It does not verify that carbon was actually removed. That needs auditors, satellites and
            sensors. The AI check only flags mismatches for a human to review.
          </p>
        </div>
      </section>
    </div>
  );
}