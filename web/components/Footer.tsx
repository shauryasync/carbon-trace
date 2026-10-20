import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-[#E4E4DC] bg-white">
      <div className="mx-auto max-w-[1120px] px-4 py-8 text-xs leading-relaxed text-[#5B6660] sm:px-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="max-w-3xl">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3F4944]">Disclaimer &amp; technical scope</p>
            <p className="text-sm text-[#0E1512]">
              Prototype with synthetic data. This registry does not verify real-world carbon removal.
            </p>
            <p className="mt-1">
              Known limitations: anyone can call <code className="font-mono text-[#0E1512]">retire()</code> (no ownership check yet), and the
              on-chain overlap check only scales to a prototype.
            </p>
          </div>
          <div className="flex w-fit flex-col items-start gap-2 sm:items-end">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F4EA] px-3 py-1 font-medium text-[#15803D]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#15803D]" /> Sepolia Testnet
            </span>
            <Link href="/limitations" className="font-medium text-[#0B6B4F] underline underline-offset-2 transition-colors hover:text-[#00513A]">
              Limitations
            </Link>
          </div>
        </div>
        <div className="mt-6 border-t border-[#E4E4DC] pt-4 text-[11px] tracking-wide">
          © 2025 Carbon Registry. Self-declared corporate entries require cryptographic attestations.
        </div>
      </div>
    </footer>
  );
}