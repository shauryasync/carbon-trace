import { ShieldCheck, ShieldOff } from "lucide-react";
import HeroButtons from "@/components/HeroButtons";

export default function Home() {
  return (
    <>
      <section className="rounded-3xl bg-gradient-to-br from-emerald-700 to-teal-600 px-8 py-16 text-white shadow-lg">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          One carbon credit. One record. Counted once.
        </h1>
        <p className="mt-4 max-w-2xl text-emerald-50">
          A public registry that makes credit records unique, tamper-proof and
          traceable, and shows who vouched for them.
        </p>
        <HeroButtons />
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
          <ShieldCheck className="h-6 w-6 text-emerald-700" />
          <h2 className="mt-3 font-semibold">What it does</h2>
          <p className="mt-1 text-sm text-slate-600">
            Blocks the same serial range from being registered twice for a
            project, anchors an evidence fingerprint on-chain, and shows which
            approved auditor attested a batch.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-900">
          <ShieldOff className="h-6 w-6 text-red-600" />
          <h2 className="mt-3 font-semibold">What it does not do</h2>
          <p className="mt-1 text-sm text-slate-600">
            It does not verify that carbon was actually removed. That needs
            auditors, satellites and sensors.
          </p>
        </div>
      </section>
    </>
  );
}