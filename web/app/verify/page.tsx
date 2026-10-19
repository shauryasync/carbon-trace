"use client";
// PUBLIC page: no login, no MetaMask, no wallet code. Only calls /api/serials and /api/companies.
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatEther } from "ethers"; // pure number formatting, no provider
import { explorerTx } from "@/lib/contract";
import type { SerialMatch, SerialResult, Transfer } from "@/components/types";
import { fetchCompanies, fmtDate, httpMessage, nameOf } from "@/components/format";

function Card({ m, names }: { m: SerialMatch; names: Record<string, string> }) {
  // Not verified if the chain could not be read or the status came from the index only.
  const unverified = !m.chain.checked || m.statusSource === "index (unverified)";
  const transfers = [...m.transfers].sort((a, b) => b.blockNumber - a.blockNumber); // newest first

  return (
    <article className={`rounded-lg border bg-white p-4 ${m.status === "retired" ? "border-red-700" : "border-stone-300"}`}>
      {m.status === "retired" && (
        <div className="mb-3 rounded bg-red-700 p-3 text-center text-xl font-bold text-white">
          RETIRED: this credit has been used
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{m.projectId}</h2>
        <span className="rounded bg-stone-200 px-2 py-0.5 text-sm">{m.status}</span>
        {unverified ? (
          <span className="rounded bg-amber-200 px-2 py-0.5 text-sm">not verified on-chain</span>
        ) : (
          <span className="rounded bg-stone-200 px-2 py-0.5 text-sm">status read from chain</span>
        )}
      </div>
      <p className="text-sm text-stone-700">
        Vintage {m.vintage} (reported by the issuer, not proven on-chain) · batch #{m.batchId} · serials {m.startSerial}–{m.endSerial}
      </p>

      <dl className="mt-3 space-y-1 text-sm">
        <div><dt className="inline font-medium">Issuer: </dt><dd className="inline">{nameOf(names, m.issuer)}</dd></div>
        <div><dt className="inline font-medium">Auditor: </dt><dd className="inline">{m.auditor ? nameOf(names, m.auditor) : "not yet attested"}</dd></div>
        <div>
          <dt className="inline font-medium">Current owner: </dt>
          <dd className="inline">{nameOf(names, m.owner)} <span className="text-stone-600">({m.ownerSource})</span></dd>
        </div>
      </dl>

      {m.warning && <p className="mt-3 rounded bg-sky-50 p-2 text-sm text-sky-900">Note: {m.warning}</p>}

      <h3 className="mt-4 font-medium">Transfer history</h3>
      {transfers.length === 0 ? (
        <p className="text-sm text-stone-600">No transfers recorded. Still held by the issuer.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {transfers.map((t) => (
            <li key={`${t.txHash}-${t.logIndex}`}>
              {fmtDate(t.timestamp)}: {nameOf(names, t.seller)} → {nameOf(names, t.buyer)}, serials {t.startSerial}–{t.endSerial},{" "}
              {formatEther(t.totalPriceWei)} ETH (testnet){" "}
              <a className="underline" href={explorerTx(t.txHash)} target="_blank" rel="noreferrer">transaction</a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function VerifyInner() {
  const router = useRouter();
  const urlSerial = useSearchParams().get("serial") ?? "";
  const [input, setInput] = useState(urlSerial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<SerialResult | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!urlSerial) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(""); setData(null);
      try {
        const res = await fetch(`/api/serials/${encodeURIComponent(urlSerial)}`);
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) { setError(httpMessage(res.status, body)); return; }
        const result = body as SerialResult;
        const historyRes = await fetch(`/api/transfers?serial=${encodeURIComponent(urlSerial)}`);
        const historyBody = await historyRes.json().catch(() => ({}));
        if (cancelled) return;
        if (!historyRes.ok) { setError(httpMessage(historyRes.status, historyBody)); return; }
        if (!Array.isArray(historyBody.transfers)) {
          setError("The transaction history response was invalid. Try again.");
          return;
        }
        const history = historyBody.transfers as Transfer[];
        const matches = result.matches.map((m) => ({
          ...m,
          transfers: history.filter((t) => t.batchId === m.batchId),
        }));
        setData({ ...result, matches });
        // ONE companies call for every address on the page.
        const addrs = matches.flatMap((m) => [
          m.owner, m.issuer, ...(m.auditor ? [m.auditor] : []), ...m.transfers.flatMap((t) => [t.seller, t.buyer]),
        ]);
        const n = await fetchCompanies(addrs);
        if (!cancelled) setNames(n);
      } catch {
        if (!cancelled) setError("Something went wrong on our side. Try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [urlSerial]);

  const go = () => router.push(`/verify?serial=${encodeURIComponent(input.trim())}`);
  // The QR encodes this page's URL with the serial in it.
  // NOTE: uses the qrserver.com image API because no QR package is installed (see notes).
  const pageUrl = typeof window !== "undefined" && urlSerial ? `${window.location.origin}/verify?serial=${encodeURIComponent(urlSerial)}` : "";

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Verify a serial number</h1>
      <p className="mb-4 text-sm text-stone-700">
        Prototype on the Sepolia testnet with synthetic data. We check records, not real-world carbon removal.
      </p>
      <div className="mb-6 flex gap-2">
        <input className="flex-1 rounded border border-stone-400 p-2" inputMode="numeric" placeholder="Serial number, e.g. 1200"
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <button className="rounded bg-emerald-800 px-4 text-white" onClick={go}>Look up</button>
      </div>

      {loading && <p>Looking up…</p>}
      {error && <p className="text-red-700">{error}</p>}
      {data && !data.found && (
        <p className="rounded bg-stone-100 p-3">
          Not found in the index. (That does not tell us anything about the chain; the index may simply not know this serial.)
        </p>
      )}
      {data?.found && (
        <div className="space-y-4">
          {data.matches.length > 1 && <p className="text-sm">This serial appears in {data.matches.length} different projects.</p>}
          {data.matches.map((m) => <Card key={m.batchId} m={m} names={names} />)}
          <div className="flex items-center gap-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="QR code for this page" width={110} height={110}
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(pageUrl)}`} />
            <span>Scan to open this lookup.</span>
          </div>
        </div>
      )}
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><VerifyInner /></Suspense>;
}
