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
        const res = await fetch(`/api/transfers?address=${company.address}`);
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
    <div className="space-y-6 text-sm">
      {error && <p className="text-red-700">{error}</p>}
      <section>
        <h2 className="mb-2 text-lg font-medium">Current holdings (read from the chain)</h2>
        {held === null ? <p>Loading…</p> : held.length === 0 ? <p>No holdings found.</p> : (
          <ul className="space-y-1">{held.map((h, i) => <li key={i}>Batch #{h.batchId}: serials {h.startSerial}–{h.endSerial}</li>)}</ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-medium">History</h2>
        {transfers === null ? <p>Loading…</p> : transfers.length === 0 ? <p>No transactions yet.</p> : (
          <ul className="space-y-1">
            {transfers.map((t) => {
              const sold = sameAddr(t.seller, company.address); // "Sold" if we were the seller
              const other = sold ? t.buyer : t.seller;
              return (
                <li key={`${t.txHash}-${t.logIndex}`}>
                  <b>{sold ? "Sold" : "Bought"}</b> serials {t.startSerial}–{t.endSerial} (batch #{t.batchId}) {sold ? "to" : "from"} {nameOf(names, other)} for {formatEther(t.totalPriceWei)} ETH on {fmtDate(t.timestamp)}{" "}
                  <a className="underline" href={explorerTx(t.txHash)} target="_blank" rel="noreferrer">transaction</a>
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
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Company dashboard</h1>
      <p className="mb-4 text-sm text-stone-700">Prototype on the Sepolia testnet with synthetic data. History comes from the search index and may lag behind the chain.</p>
      <AuthGuard>{(c) => <Dashboard company={c} />}</AuthGuard>
    </main>
  );
}
