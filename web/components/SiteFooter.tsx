import Link from "next/link";

// Add <SiteFooter /> to app/layout.tsx (I could not see your layout file).
export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-stone-300 px-4 py-6 text-sm text-stone-700">
      <p>
        Prototype on the Sepolia testnet with synthetic data. We make credit records unique,
        tamper-proof and publicly traceable. We do not verify real-world carbon removal.
      </p>
      <Link href="/limitations" className="underline">Limitations</Link>
    </footer>
  );
}
