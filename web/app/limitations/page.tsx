export default function Limitations() {
  return (
    <main className="mx-auto max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8A6D1D]">Technical scope · prototype disclosure</p>
      <h1 className="mb-3 mt-2 font-serif text-4xl font-medium tracking-tight text-[#0E1512]">Limitations</h1>
      <p className="mb-6 text-sm leading-6 text-[#5B6660]">Carbon-Trace is a prototype on the Sepolia testnet with synthetic data.</p>
      <ul className="divide-y divide-[#E4E4DC] rounded-xl border border-[#E4E4DC] bg-white px-5">
        <li className="py-4 text-sm leading-6 text-[#3F4944]">We make credit records unique and publicly traceable. We do not verify real-world carbon removal.</li>
        <li className="py-4 text-sm leading-6 text-[#3F4944]">Anyone can retire a credit (there is no ownership check yet).</li>
        <li className="py-4 text-sm leading-6 text-[#3F4944]">A retired credit can still be listed and sold.</li>
        <li className="py-4 text-sm leading-6 text-[#3F4944]">Listings are not locked: several listings can claim the same serials, and only the first buyer succeeds.</li>
        <li className="py-4 text-sm leading-6 text-[#3F4944]">The on-chain overlap check only scales to a prototype.</li>
        <li className="py-4 text-sm leading-6 text-[#3F4944]">Company names are typed by the company and are not verified. Vintage is reported by the issuer and is not proven on-chain.</li>
        <li className="py-4 text-sm leading-6 text-[#3F4944]">The search index can lag behind the chain. A batch that is on-chain but not indexed shows as &quot;Not found in the index&quot;.</li>
        <li className="py-4 text-sm leading-6 text-[#3F4944]">Verification through a registry such as Verra is future scope. No such integration exists today.</li>
      </ul>
    </main>
  );
}
