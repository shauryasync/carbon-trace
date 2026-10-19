"use client";
import { useState } from "react";
import { parseEther } from "ethers";
import AuthGuard from "@/components/AuthGuard";
import { createListing, explorerTx, getHoldings, readableError } from "@/lib/contract";
import type { CompanyProfile } from "@/lib/auth-client";

type Holding = { startSerial: number; endSerial: number };

function SellForm({ company }: { company: CompanyProfile }) {
  const [batchId, setBatchId] = useState("");
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [qty, setQty] = useState("");
  const [priceEth, setPriceEth] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ txHash: string; listingId: number; startSerial: number; endSerial: number } | null>(null);

  async function load() {
    setError(""); setHoldings(null); setDone(null);
    try { setHoldings(await getHoldings(Number(batchId), company.address)); setIdx(0); }
    catch (e) { setError(readableError(e)); }
  }

  async function sell() {
    setError(""); setDone(null); setBusy(true);
    try {
      const priceWei = parseEther(priceEth); // ETH text -> wei (bigint)
      setDone(await createListing(Number(batchId), idx, Number(qty), priceWei));
    } catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  }

  const input = "mt-1 w-full rounded border border-stone-400 p-2";
  return (
    <div className="max-w-lg space-y-3">
      <div className="flex items-end gap-2">
        <label className="flex-1 text-sm">Batch ID<input className={input} inputMode="numeric" value={batchId} onChange={(e) => setBatchId(e.target.value)} /></label>
        <button onClick={load} className="rounded border border-stone-500 px-3 py-2">Show my credits</button>
      </div>

      {holdings && holdings.length === 0 && <p className="text-sm">You hold no credits in this batch.</p>}
      {holdings && holdings.length > 0 && (
        <>
          <label className="block text-sm">Which range?
            <select className={input} value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
              {holdings.map((h, i) => <option key={i} value={i}>Serials {h.startSerial}–{h.endSerial} ({h.endSerial - h.startSerial + 1} credits)</option>)}
            </select>
          </label>
          <label className="block text-sm">How many credits?<input className={input} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <label className="block text-sm">Price per credit (test ETH)<input className={input} value={priceEth} onChange={(e) => setPriceEth(e.target.value)} placeholder="0.0001" /></label>
          <button onClick={sell} disabled={busy} className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50">{busy ? "Waiting for MetaMask / chain…" : "Create listing"}</button>
        </>
      )}

      {error && <p className="rounded border border-red-700 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {done && (
        <p className="rounded bg-emerald-50 p-3 text-sm">
          Listing #{done.listingId} created for serials {done.startSerial}–{done.endSerial}.{" "}
          <a className="underline" href={explorerTx(done.txHash)} target="_blank" rel="noreferrer">View transaction</a>
        </p>
      )}
    </div>
  );
}

export default function SellPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Sell credits</h1>
      <p className="mb-4 text-sm text-stone-700">Prototype on the Sepolia testnet. Prices are in test ETH with no real value. Known limitation: a retired credit can still be listed and sold.</p>
      <AuthGuard>{(c) => <SellForm company={c} />}</AuthGuard>
    </main>
  );
}
