export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs leading-relaxed text-slate-500">
        Prototype with synthetic data. This registry does not verify real-world carbon removal.
        Known limitations: anyone can call <code>retire()</code> (no ownership check yet), and the
        on-chain overlap check only scales to a prototype.
      </div>
    </footer>
  );
}