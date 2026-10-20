"use client";
import { useEffect, useState } from "react";
import { formatEther } from "ethers";
import AuthGuard from "@/components/AuthGuard";
import { fetchCompanies, fmtDate, httpMessage, nameOf, sameAddr } from "@/components/format";
import type { Transfer } from "@/components/types";
import { explorerTx, getHoldings } from "@/lib/contract";
import type { CompanyProfile } from "@/lib/auth-client";

type Held = { batchId: number; startSerial: number; endSerial: number };

function Dashboard({ company }: { company: CompanyProfile }) {
  const [transfers, setTransfers] = useState<Transfer[] | null>(null);
  const [held, setHeld] = useState<Held[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/transfers?address=${encodeURIComponent(company.address)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return setError(httpMessage(res.status, data));
        const ts: Transfer[] = data.transfers;
        setTransfers(ts);
        setNames(await fetchCompanies(ts.flatMap((t) => [t.seller, t.buyer])));

        // Which batches might this wallet hold? Ones it traded in, plus ones it issued.
        const ids = new Set<number>(ts.map((t) => t.batchId));
        const cr = await fetch("/api/credits");
        if (cr.ok) {
          for (const c of (await cr.json()).credits) if (sameAddr(c.issuer, company.address)) ids.add(c.batchId);
        }
        const rows: Held[] = [];
        for (const batchId of ids) {
          try { for (const h of await getHoldings(batchId, company.address)) rows.push({ batchId, ...h }); } catch { /* skip */ }
        }
        setHeld(rows);
      } catch { setError("Something went wrong on our side. Try again."); }
    })();
  }, [company.address]);

  return (
    <div className="space-y-10 text-sm">
      {error && <p className="rounded-lg border border-[#B42318]/30 bg-[#FDECEA] p-4 text-[#B42318]" role="alert">{error}</p>}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-[#E4E4DC] pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6660]">Sepolia · current chain state</p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-[#0E1512]">Current holdings</h2>
          </div>
          <span className="rounded-full bg-[#E6F4EA] px-3 py-1 text-xs font-medium text-[#15803D]">Read from the chain</span>
        </div>
        {held === null ? (
          <p className="rounded-lg border border-[#E4E4DC] bg-white p-4 text-sm text-[#5B6660]">Loading holdings…</p>
        ) : held.length === 0 ? (
          <p className="rounded-lg border border-[#E4E4DC] bg-white p-4 text-sm text-[#5B6660]">No holdings found.</p>
        ) : (
          <ul className="space-y-3">{held.map((h, i) => (
            <li key={i} className="rounded-xl border border-[#E4E4DC] bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-lg font-medium text-[#0E1512]">Batch #{h.batchId}</p>
                  <p className="mt-1 font-mono text-sm text-[#3F4944]">Serials {h.startSerial}–{h.endSerial}</p>
                </div>
                <span className="rounded-full bg-[#E3F1EB] px-3 py-1 text-xs font-medium text-[#0B6B4F]">
                  {h.endSerial - h.startSerial + 1} credits
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-[#E3F1EB]" />
              <p className="mt-2 text-xs text-[#5B6660]">Current holding · read from the chain</p>
            </li>
          ))}</ul>
        )}
      </section>
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-[#E4E4DC] pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6660]">Indexed events</p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-[#0E1512]">History</h2>
          </div>
          <p className="text-xs text-[#5B6660]">History may lag behind the chain.</p>
        </div>
        {transfers === null ? (
          <p className="rounded-lg border border-[#E4E4DC] bg-white p-4 text-sm text-[#5B6660]">Loading history…</p>
        ) : transfers.length === 0 ? (
          <p className="rounded-lg border border-[#E4E4DC] bg-white p-4 text-sm text-[#5B6660]">No transactions yet.</p>
        ) : (
          <ul className="space-y-0 rounded-xl border border-[#E4E4DC] bg-white px-5">
            {transfers.map((t) => {
              const sold = sameAddr(t.seller, company.address); // "Sold" if we were the seller
              const other = sold ? t.buyer : t.seller;
              return (
                <li key={`${t.txHash}-${t.logIndex}`} className="flex flex-col justify-between gap-3 border-b border-[#E4E4DC] py-4 last:border-b-0 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <span className={`mr-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${sold ? "bg-[#FBF3DC] text-[#8A6D1D]" : "bg-[#E6F4EA] text-[#15803D]"}`}>{sold ? "Sold" : "Bought"}</span>
                    <span className="font-mono text-xs text-[#0E1512]">Serials {t.startSerial}–{t.endSerial}</span>
                    <p className="mt-2 text-xs leading-5 text-[#5B6660]">
                      Batch #{t.batchId} · {sold ? "to" : "from"} {nameOf(names, other)} (self-declared) · {formatEther(t.totalPriceWei)} ETH · {fmtDate(t.timestamp)}
                    </p>
                  </div>
                  <a className="shrink-0 font-mono text-xs font-medium text-[#0B6B4F] underline underline-offset-2" href={explorerTx(t.txHash)} target="_blank" rel="noreferrer">Transaction ↗</a>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-5xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0B6B4F]">Sepolia indexer · on-chain holdings</p>
      <h1 className="mb-1 mt-2 font-serif text-4xl font-medium tracking-tight text-[#0E1512]">Company dashboard</h1>
      <p className="mb-8 max-w-2xl text-sm leading-6 text-[#5B6660]">History comes from the search index and may lag behind the chain.</p>
      <AuthGuard>{(c) => <Dashboard company={c} />}</AuthGuard>
    </main>
  );
}
