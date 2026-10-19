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
    const r = await indexTransfer(bought.txHash); // safe to repeat
    setBought({ ...bought, indexed: r.indexed, indexError: r.indexError });
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-[#B42318]/30 bg-[#FDECEA] p-4 text-sm text-[#B42318]" role="alert">{error}</p>}
      {bought && (
        <div className="rounded-lg border border-[#15803D]/20 bg-[#E6F4EA] p-4 text-sm text-[#0E1512]">
          <p>Purchase confirmed on-chain. <a className="font-medium text-[#0B6B4F] underline underline-offset-2" href={explorerTx(bought.txHash)} target="_blank" rel="noreferrer">View transaction</a></p>
          {!bought.indexed && (
            <div className="mt-3 rounded-md border border-[#8A6D1D]/20 bg-[#FBF3DC] p-3">
              <p>Purchase confirmed on-chain, history not updated yet.</p>
              {bought.indexError && <p className="mt-1 text-xs text-[#8A6D1D]">{friendlyIndexError(bought.indexError)}</p>}
              <button onClick={retrySync} className="mt-2 min-h-10 rounded-md border border-[#E4E4DC] bg-white px-3 py-1 text-sm">Retry</button>
            </div>
          )}
        </div>
      )}

      {listings === null && !error && <p className="rounded-xl border border-[#E4E4DC] bg-white p-5 text-sm text-[#5B6660]">Loading listings from the chain…</p>}
      {listings?.length === 0 && (
        <p className="rounded-xl border border-[#E4E4DC] bg-white p-5 text-sm leading-6 text-[#5B6660]">
          No active listings right now. If you hold credits, <Link className="font-medium text-[#0B6B4F] underline underline-offset-2" href="/sell">create a Sell listing</Link> so buyers can purchase them.
        </p>
      )}
      {listings?.map((l) => {
        const qty = l.endSerial - l.startSerial + 1;
        const price = BigInt(l.pricePerCreditWei);
        const mine = sameAddr(l.seller, company.address);
        return (
          <article key={l.listingId} className="overflow-hidden rounded-xl border border-[#E4E4DC] bg-white">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#E4E4DC] pb-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6660]">Batch #{l.batchId}</p>
                  <p className="mt-1 font-mono text-base font-semibold text-[#0E1512]">Serials {l.startSerial}–{l.endSerial}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${mine ? "bg-[#FBF3DC] text-[#8A6D1D]" : "bg-[#E6F4EA] text-[#15803D]"}`}>
                  {mine ? "Your listing" : "Active listing"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-[#3F4944]">Seller: <span className="font-medium text-[#0E1512]">{nameOf(names, l.seller)}</span> <span className="text-xs text-[#5B6660]">(self-declared)</span></p>
                <p className="font-mono text-xs text-[#5B6660]">{qty} credits</p>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#F2F2EC]">
                <div className="h-2 w-full rounded-full bg-[#0B6B4F]" />
              </div>
              <div className="mt-2 flex justify-between font-mono text-xs text-[#5B6660]"><span>{l.startSerial}</span><span>{l.endSerial}</span></div>
            </div>
            <div className="flex flex-col justify-between gap-4 border-t border-[#E4E4DC] bg-[#FAFAF7] p-5 sm:flex-row sm:items-center sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#5B6660]">{mine ? "Offered price (test ETH)" : "Total required (test ETH)"}</p>
                <p className="mt-1 font-mono text-xl font-semibold text-[#0E1512]">
                  {formatEther(price * BigInt(qty))} ETH <span className="text-xs font-normal text-[#5B6660]">· {formatEther(price)} ETH / credit</span>
                </p>
              </div>
              {mine ? (
                <button onClick={() => cancel(l.listingId)} disabled={busyId === l.listingId} className="min-h-11 rounded-lg border border-[#E4E4DC] bg-white px-4 py-2 text-sm font-medium text-[#0E1512] transition-colors hover:bg-[#F2F2EC] disabled:opacity-50">Cancel my listing</button>
              ) : (
                <button onClick={() => buy(l.listingId)} disabled={busyId === l.listingId} className="min-h-11 rounded-lg bg-[#0B6B4F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F] disabled:opacity-50">
                  {busyId === l.listingId ? "Waiting…" : `Buy ${qty} credits`}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function BuyPage() {
  return (
    <main className="mx-auto max-w-5xl">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-[#E4E4DC] pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B6B4F]">Sepolia orderbook · live chain listings</p>
          <h1 className="mb-1 mt-2 font-serif text-4xl font-medium tracking-tight text-[#0E1512]">Buy credits</h1>
          <p className="max-w-2xl text-sm leading-6 text-[#5B6660]">Prototype on the Sepolia testnet with synthetic data and test ETH. Listings are read straight from the chain.</p>
        </div>
        <span className="rounded-full bg-[#E6F4EA] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#15803D]">Sepolia orderbook</span>
      </div>
      <AuthGuard>{(c) => <BuyList company={c} />}</AuthGuard>
    </main>
  );
}
