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

  const input = "mt-2 min-h-11 w-full rounded-lg border border-[#E4E4DC] bg-white px-3 py-2 text-sm text-[#0E1512] focus:border-[#0B6B4F] focus:outline-none focus:ring-2 focus:ring-[#0B6B4F]/20";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#E4E4DC] bg-white">
        <div className="border-b border-[#E4E4DC] bg-[#F2F2EC] px-5 py-4 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0B6B4F]">Orderbook registry · atomic non-custodial</p>
          <p className="mt-1 text-sm text-[#5B6660]">Credits remain in your wallet until fulfilled.</p>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-col items-end gap-3 sm:flex-row">
            <label className="block w-full text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">Batch ID<input className={input} inputMode="numeric" value={batchId} onChange={(e) => { setBatchId(e.target.value); setHoldings(null); setDone(null); }} placeholder="For example, 0" /></label>
            <button onClick={load} disabled={loading || busy} className="min-h-11 w-full shrink-0 rounded-lg border border-[#E4E4DC] bg-[#E3F1EB] px-4 py-2 text-sm font-semibold text-[#0B6B4F] transition-colors hover:bg-[#D6EAE1] disabled:opacity-50 sm:w-auto">{loading ? "Loading…" : "Show my credits"}</button>
          </div>

      {holdings && holdings.length === 0 && (
        <p className="rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] p-4 text-sm leading-6 text-[#5B6660]">
          You hold no credits in this batch. If you have not registered credits yet, <Link className="underline" href="/register">register a batch</Link> first, using this same wallet.
        </p>
      )}
      {holdings && holdings.length > 0 && (
        <div className="space-y-4 rounded-lg bg-[#F2F2EC] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">Which range?
              <select className={input} value={idx} onChange={(e) => setIdx(Number(e.target.value))}>
                {holdings.map((h, i) => <option key={i} value={i}>Serials {h.startSerial}–{h.endSerial} ({h.endSerial - h.startSerial + 1} credits)</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">How many credits?<input className={input} inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
            <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">Price per credit (test ETH)<input className={input} inputMode="decimal" value={priceEth} onChange={(e) => setPriceEth(e.target.value)} placeholder="0.0001" /></label>
          </div>
          <button onClick={sell} disabled={busy || loading} className="min-h-11 w-full rounded-lg bg-[#0B6B4F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F] disabled:opacity-50">{busy ? "Waiting for MetaMask / chain…" : "Create listing"}</button>
        </div>
      )}

      {error && <p className="rounded-lg border border-[#B42318]/30 bg-[#FDECEA] p-4 text-sm text-[#B42318]" role="alert">{error}</p>}
      {done && (
        <p className="rounded-lg border border-[#15803D]/20 bg-[#E6F4EA] p-4 text-sm text-[#0E1512]">
          Listing #{done.listingId} created for serials {done.startSerial}–{done.endSerial}.{" "}
          <a className="font-medium text-[#0B6B4F] underline underline-offset-2" href={explorerTx(done.txHash)} target="_blank" rel="noreferrer">View transaction</a>
        </p>
      )}
        </div>
      </section>
      <p className="rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] p-4 text-xs leading-5 text-[#5B6660]">
        Listed credits remain in your custody until a buyer executes settlement. Prices are in test ETH and have no real value.
      </p>
    </div>
  );
}

export default function SellPage() {
  return (
    <main className="mx-auto max-w-5xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6660]">Orderbook registry · atomic non-custodial</p>
      <h1 className="mb-1 mt-2 font-serif text-4xl font-medium tracking-tight text-[#0E1512]">Sell credits</h1>
      <p className="mb-7 max-w-2xl text-sm leading-6 text-[#5B6660]">Prototype on the Sepolia testnet. Prices are in test ETH with no real value. Credits remain in your wallet until fulfilled.</p>
      <AuthGuard>{(c) => <SellForm company={c} />}</AuthGuard>
    </main>
  );
}
