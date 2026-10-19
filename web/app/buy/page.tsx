"use client";
import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { formatEther } from "ethers";
import AuthGuard from "@/components/AuthGuard";
import { fetchCompanies, friendlyIndexError, nameOf, sameAddr } from "@/components/format";
import { buyListing, cancelListing, explorerTx, getListing, indexTransfer, readableError } from "@/lib/contract";
import type { CompanyProfile } from "@/lib/auth-client";

type Listing = Awaited<ReturnType<typeof getListing>>;

// contract.ts has no listing counter, so ask for listing 0, 1, 2... until one fails.
// (Ask the Chain owner for getListingCount() to make this faster and more reliable.)
async function loadListings(): Promise<Listing[]> {
  const out: Listing[] = [];
  for (let id = 0; id < 200; id++) {
    try { out.push(await getListing(id)); } catch { break; }
  }
  return out.filter((l) => l.active);
}

function BuyList({ company }: { company: CompanyProfile }) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [bought, setBought] = useState<{ txHash: string; indexed: boolean; indexError: string | null } | null>(null);

  const refresh = useCallback(async () => {
    const ls = await loadListings();
    setListings(ls);
    setNames(await fetchCompanies(ls.map((l) => l.seller)));
  }, []);
  useEffect(() => { refresh().catch((e) => setError(readableError(e))); }, [refresh]);

  async function buy(id: number) {
    setError(""); setBought(null); setBusyId(id);
    try {
      const r = await buyListing(id); // also tries to sync the purchase to the backend
      setBought({ txHash: r.txHash, indexed: r.indexed, indexError: r.indexError });
      confetti();
      await refresh();
    } catch (e) {
      setError(readableError(e)); // e.g. "Listing no longer valid"
      await refresh().catch(() => {}); // refresh the list either way
    } finally { setBusyId(null); }
  }

  async function cancel(id: number) {
    setError(""); setBusyId(id);
    try { await cancelListing(id); await refresh(); }
    catch (e) { setError(readableError(e)); }
    finally { setBusyId(null); }
  }

  async function retrySync() {
    if (!bought) return;
    const r = await indexTransfer(bought.txHash); // safe to repeat
    setBought({ ...bought, indexed: r.indexed, indexError: r.indexError });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded border border-red-700 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {bought && (
        <div className="rounded bg-emerald-50 p-3 text-sm">
          <p>Purchase confirmed on-chain. <a className="underline" href={explorerTx(bought.txHash)} target="_blank" rel="noreferrer">View transaction</a></p>
          {!bought.indexed && (
            <div className="mt-2 rounded bg-amber-100 p-2">
              <p>Purchase confirmed on-chain, history not updated yet.</p>
              {bought.indexError && <p className="text-xs">{friendlyIndexError(bought.indexError)}</p>}
              <button onClick={retrySync} className="mt-1 rounded border border-stone-500 px-2 py-1">Retry</button>
            </div>
          )}
        </div>
      )}

      {listings === null && !error && <p>Loading listings from the chain…</p>}
      {listings?.length === 0 && <p>No active listings.</p>}
      {listings?.map((l) => {
        const qty = l.endSerial - l.startSerial + 1;
        const price = BigInt(l.pricePerCreditWei);
        const mine = sameAddr(l.seller, company.address);
        return (
          <article key={l.listingId} className="rounded-lg border border-stone-300 bg-white p-4 text-sm">
            <p className="font-medium">Batch #{l.batchId}: serials {l.startSerial}–{l.endSerial} ({qty} credits)</p>
            <p>Seller: {nameOf(names, l.seller)}</p>
            <p>{formatEther(price)} ETH per credit · total {formatEther(price * BigInt(qty))} ETH (test ETH)</p>
            {mine ? (
              <button onClick={() => cancel(l.listingId)} disabled={busyId === l.listingId} className="mt-2 rounded border border-stone-500 px-3 py-1 disabled:opacity-50">Cancel my listing</button>
            ) : (
              <button onClick={() => buy(l.listingId)} disabled={busyId === l.listingId} className="mt-2 rounded bg-emerald-800 px-3 py-1 text-white disabled:opacity-50">
                {busyId === l.listingId ? "Waiting…" : "Buy"}
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function BuyPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Buy credits</h1>
      <p className="mb-4 text-sm text-stone-700">Prototype on the Sepolia testnet with synthetic data and test ETH. Listings are read straight from the chain.</p>
      <AuthGuard>{(c) => <BuyList company={c} />}</AuthGuard>
    </main>
  );
}
