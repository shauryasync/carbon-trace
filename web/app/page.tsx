import { ShieldCheck, ShieldOff } from "lucide-react";
import HeroButtons from "@/components/HeroButtons";

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 py-6 md:grid-cols-[1.1fr_0.9fr] md:gap-14 md:py-12">
        <div>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B6B4F]">Deterministic ledger · Sepolia testnet</p>
          <h1 className="max-w-2xl font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-[#0E1512] sm:text-5xl md:text-6xl">
            One carbon credit. One record. Counted once.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#5B6660]">
            A public registry that makes credit records unique, tamper-proof and traceable, while showing who vouched for them.
          </p>
          <HeroButtons />
          <p className="mt-6 border-l-2 border-[#0B6B4F] pl-3 text-sm leading-6 text-[#5B6660]">
            We record registry claims; we do not verify real-world carbon removal.
          </p>
        </div>
        <div className="rounded-xl border border-[#E4E4DC] bg-white p-6">
          <div className="flex items-center gap-2 border-b border-[#E4E4DC] pb-4">
            <ShieldCheck className="h-5 w-5 text-[#0B6B4F]" />
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3F4944]">Registry guarantees</p>
          </div>
          <div className="space-y-5 py-5">
            <div>
              <h2 className="font-serif text-xl font-medium text-[#0E1512]">What it does</h2>
              <p className="mt-2 text-sm leading-6 text-[#5B6660]">
                Blocks the same serial range from being registered twice for a project and anchors an evidence fingerprint on-chain.
              </p>
            </div>
            <div className="border-t border-[#E4E4DC] pt-5">
              <div className="flex items-center gap-2">
                <ShieldOff className="h-5 w-5 text-[#8A6D1D]" />
                <h2 className="font-serif text-xl font-medium text-[#0E1512]">What it does not do</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#5B6660]">
                It does not verify that carbon was actually removed. That needs auditors, satellites and sensors.
              </p>
            </div>
          </div>
          <div className="rounded-md bg-[#F2F2EC] px-3 py-2 text-xs text-[#5B6660]">
            Auditor attestations are shown with the batch record.
          </div>
        </div>
      </section>

      <section className="border-t border-[#E4E4DC] pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6660]">Evidence first · limits made clear</p>
        <h2 className="mt-2 font-serif text-3xl font-medium tracking-tight text-[#0E1512]">A public record, with explicit boundaries.</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-xl border border-[#E4E4DC] bg-white p-6">
            <ShieldCheck className="h-6 w-6 text-[#15803D]" />
            <h3 className="mt-3 font-serif text-xl font-medium text-[#0E1512]">Unique records</h3>
            <p className="mt-2 text-sm leading-6 text-[#5B6660]">
              Serial ranges are checked against existing project records, and evidence fingerprints are anchored on-chain.
            </p>
          </article>
          <article className="rounded-xl border border-[#E4E4DC] bg-white p-6">
            <ShieldOff className="h-6 w-6 text-[#8A6D1D]" />
            <h3 className="mt-3 font-serif text-xl font-medium text-[#0E1512]">Not a carbon-removal audit</h3>
            <p className="mt-2 text-sm leading-6 text-[#5B6660]">
              The registry makes records traceable; it does not prove a project removed carbon from the atmosphere.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}