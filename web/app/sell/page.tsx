"use client";
import { useState } from "react";
import Link from "next/link";
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
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ txHash: string; listingId: number; startSerial: number; endSerial: number } | null>(null);

  async function load() {
    setError(""); setHoldings(null); setDone(null);
    const id = batchId.trim();
    if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) {
      setError("Enter a valid batch ID (a whole number, such as 0).");
      return;
    }
    setLoading(true);
    try { setHoldings(await getHoldings(Number(id), company.address)); setIdx(0); }
    catch (e) { setError(readableError(e)); }
    finally { setLoading(false); }
  }

  async function sell() {
    setError(""); setDone(null);
    const quantity = Number(qty);
    const holding = holdings?.[idx];
    if (!holding) return setError("Load a batch where you hold credits before creating a listing.");
    if (!/^\d+$/.test(qty.trim()) || !Number.isSafeInteger(quantity) || quantity < 1) {
      return setError("Enter a whole-number quantity greater than zero.");
    }
    if (quantity > holding.endSerial - holding.startSerial + 1) {
      return setError("The quantity cannot exceed the credits in the selected range.");
    }
    let priceWei: bigint;
    try {
      priceWei = parseEther(priceEth.trim());
    } catch {
      return setError("Enter a valid price in ETH with up to 18 decimal places.");
    }
    if (priceWei <= BigInt(0)) return setError("Price per credit must be greater than zero.");

    setBusy(true);
    try {
      setDone(await createListing(Number(batchId), idx, quantity, priceWei, company.address));
    } catch (e) { setError(readableError(e)); }
    finally { setBusy(false); }
  }

  const input = "mt-1 w-full rounded border border-stone-400 p-2";
  return (
    <div className="max-w-lg space-y-3">
      <div className="flex items-end gap-2">
        <label className="flex-1 text-sm">Batch ID<input className={input} inputMode="numeric" value={batchId} onChange={(e) => { setBatchId(e.target.value); setHoldings(null); setDone(null); }} placeholder="For example, 0" /></label>
        <button onClick={load} disabled={loading || busy} className="rounded border border-stone-500 px-3 py-2 disabled:opacity-50">{loading ? "Loading…" : "Show my credits"}</button>
      </div>

      {holdings && holdings.length === 0 && (
        <p className="text-sm">
          You hold no credits in this batch. If you have not registered credits yet, <Link className="underline" href="/register">register a batch</Link> first, using this same wallet.
        </p>
      )}
      {holdings && holdings.length > 0 && (
        <>
          <label className="block text-sm">Which range?
            <select className={input} value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
              {holdings.map((h, i) => <option key={i} value={i}>Serials {h.startSerial}–{h.endSerial} ({h.endSerial - h.startSerial + 1} credits)</option>)}
            </select>
          </label>
          <label className="block text-sm">How many credits?<input className={input} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <label className="block text-sm">Price per credit (test ETH)<input className={input} inputMode="decimal" value={priceEth} onChange={(e) => setPriceEth(e.target.value)} placeholder="0.0001" /></label>
          <button onClick={sell} disabled={busy || loading} className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50">{busy ? "Waiting for MetaMask / chain…" : "Create listing"}</button>
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
