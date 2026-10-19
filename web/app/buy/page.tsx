"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import confetti from "canvas-confetti";
import { formatEther } from "ethers";
import AuthGuard from "@/components/AuthGuard";
import { fetchCompanies, friendlyIndexError, nameOf, sameAddr } from "@/components/format";
import { buyListing, cancelListing, explorerTx, getListing, getListingCount, indexTransfer, readableError } from "@/lib/contract";
import type { CompanyProfile } from "@/lib/auth-client";

type Listing = Awaited<ReturnType<typeof getListing>>;

async function loadListings(): Promise<Listing[]> {
  const out: Listing[] = [];
  const count = await getListingCount();
  for (let id = 0; id < count; id++) out.push(await getListing(id));
  return out.filter((l) => l.active);
}

async function loadMarketplace() {
  const listings = await loadListings();
  const names = await fetchCompanies(listings.map((l) => l.seller));
  return { listings, names };
}

function BuyList({ company }: { company: CompanyProfile }) {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [retryingSync, setRetryingSync] = useState(false);
  const [bought, setBought] = useState<{ txHash: string; indexed: boolean; indexError: string | null } | null>(null);

  async function refresh() {
    const result = await loadMarketplace();
    setListings(result.listings);
    setNames(result.names);
  }

  useEffect(() => {
    let cancelled = false;
    loadMarketplace()
      .then(({ listings: nextListings, names: nextNames }) => {
        if (!cancelled) {
          setListings(nextListings);
          setNames(nextNames);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(readableError(e));
      });
    return () => { cancelled = true; };
  }, []);

  async function buy(id: number) {
    setError(""); setBought(null); setBusyId(id);
    try {
      const r = await buyListing(id, company.address); // also tries to sync the purchase to the backend
      setBought({ txHash: r.txHash, indexed: r.indexed, indexError: r.indexError });
      confetti();
      try {
        await refresh();
      } catch (e) {
        setError(`Purchase succeeded, but the listings could not be refreshed: ${readableError(e)}`);
      }
    } catch (e) {
      setError(readableError(e)); // e.g. "Listing no longer valid"
      try {
        await refresh();
      } catch (refreshError) {
        setError(`${readableError(e)} Listings could not be refreshed: ${readableError(refreshError)}`);
      }
    } finally { setBusyId(null); }
  }

  async function cancel(id: number) {
    setError(""); setBusyId(id);
    try { await cancelListing(id, company.address); await refresh(); }
    catch (e) { setError(readableError(e)); }
    finally { setBusyId(null); }
  }

  async function retrySync() {
    if (!bought) return;
    setRetryingSync(true);
    setError("");
    try {
      const r = await indexTransfer(bought.txHash); // safe to repeat
      setBought({ ...bought, indexed: r.indexed, indexError: r.indexError });
    } catch (e) {
      setError(readableError(e));
    } finally {
      setRetryingSync(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded border border-red-700 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {bought && (
        <div className={bought.indexed ? "rounded bg-emerald-50 p-3 text-sm" : "rounded bg-amber-50 p-3 text-sm"}>
          {bought.indexed ? (
            <p>Purchase complete. <a className="underline" href={explorerTx(bought.txHash)} target="_blank" rel="noreferrer">View transaction</a></p>
          ) : (
            <div>
              <p>Purchase confirmed on-chain, history not updated yet.</p>
              {bought.indexError && <p className="text-xs">{friendlyIndexError(bought.indexError)}</p>}
              <div className="mt-1 flex items-center gap-3">
                <a className="underline" href={explorerTx(bought.txHash)} target="_blank" rel="noreferrer">View transaction</a>
                <button onClick={retrySync} disabled={retryingSync} className="rounded border border-stone-500 px-2 py-1 disabled:opacity-50">
                  {retryingSync ? "Retrying…" : "Retry"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {listings === null && !error && <p>Loading listings from the chain…</p>}
      {listings?.length === 0 && (
        <p className="rounded bg-stone-100 p-3 text-sm">
          No active listings right now. If you hold credits, <Link className="font-medium underline" href="/sell">create a Sell listing</Link> so buyers can purchase them.
        </p>
      )}
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
