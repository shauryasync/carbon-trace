export default function Limitations() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Limitations</h1>
      <p className="mb-3">Carbon-Trace is a prototype on the Sepolia testnet with synthetic data.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>We make credit records unique and publicly traceable. We do not verify real-world carbon removal.</li>
        <li>Anyone can retire a credit (there is no ownership check yet).</li>
        <li>A retired credit can still be listed and sold.</li>
        <li>Listings are not locked: several listings can claim the same serials, and only the first buyer succeeds.</li>
        <li>The on-chain overlap check only scales to a prototype.</li>
        <li>Company names are typed by the company and are not verified. Vintage is reported by the issuer and is not proven on-chain.</li>
        <li>The search index can lag behind the chain. A batch that is on-chain but not indexed shows as &quot;Not found in the index&quot;.</li>
        <li>Verification through a registry such as Verra is future scope. No such integration exists today.</li>
      </ul>
    </main>
  );
}
