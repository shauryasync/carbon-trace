"use client";
// PUBLIC page: no login, no MetaMask, no wallet code. Only calls /api/serials and /api/companies.
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatEther } from "ethers"; // pure number formatting, no provider
import { explorerTx } from "@/lib/contract";
import type { SerialMatch, SerialResult, Transfer } from "@/components/types";
import { fetchCompanies, fmtDate, httpMessage, nameOf } from "@/components/format";
import { QRCodeSVG } from "qrcode.react";

function Card({ m, names, serial }: { m: SerialMatch; names: Record<string, string>; serial: string }) {
  // Not verified if the chain could not be read or the status came from the index only.
  const unverified = !m.chain.checked || m.statusSource === "index (unverified)";
  const transfers = [...m.transfers].sort((a, b) => b.blockNumber - a.blockNumber); // newest first

  // Each record gets its own QR: same serial, but pinned to this batch.
  const recordUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify?serial=${encodeURIComponent(serial)}&batchId=${m.batchId}`
      : "";

  return (
    <article className={`overflow-hidden rounded-xl border bg-white ${m.status === "retired" ? "border-[#3B2F8F]/40" : "border-[#E4E4DC]"}`}>
      {m.status === "retired" && (
        <div className="flex items-center justify-center gap-2 bg-[#3B2F8F] px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.12em] text-white sm:text-base">
          <span aria-hidden="true">●</span> Retired · this credit has been used
        </div>
      )}
      <div className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-serif text-2xl font-medium text-[#0E1512]">{m.projectId}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${m.status === "retired" ? "bg-[#ECE9FA] text-[#3B2F8F]" : "bg-[#F2F2EC] text-[#3F4944]"}`}>{m.status}</span>
        {unverified ? (
          <span className="rounded-full border border-[#8A6D1D]/30 bg-[#FBF3DC] px-3 py-1 text-xs font-medium text-[#8A6D1D]">Not verified on-chain</span>
        ) : (
          <span className="rounded-full bg-[#E6F4EA] px-3 py-1 text-xs font-medium text-[#15803D]">Status read from chain</span>
        )}
      </div>
      <p className="mt-2 text-sm text-[#5B6660]">
        Vintage {m.vintage} (reported by the issuer, not proven on-chain) · batch #{m.batchId} · serials {m.startSerial}–{m.endSerial}
      </p>

      <dl className="mt-5 grid gap-3 border-y border-[#E4E4DC] py-4 text-sm sm:grid-cols-3">
        <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6660]">Issuer</dt><dd className="mt-1 font-medium text-[#0E1512]">{nameOf(names, m.issuer)} <span className="text-xs font-normal text-[#5B6660]">(self-declared)</span></dd></div>
        <div><dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6660]">Auditor</dt><dd className="mt-1 font-medium text-[#0E1512]">{m.auditor ? nameOf(names, m.auditor) : "Not yet attested"}</dd></div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5B6660]">Current owner</dt>
          <dd className="mt-1 font-medium text-[#0E1512]">{nameOf(names, m.owner)} <span className="text-xs font-normal text-[#5B6660]">({m.ownerSource})</span></dd>
        </div>
      </dl>

      {m.warning && <p className="mt-4 border-l-2 border-[#475569] bg-[#F2F2EC] p-3 text-sm text-[#475569]">Note: {m.warning}</p>}

      <h3 className="mt-5 font-serif text-xl font-medium text-[#0E1512]">Transfer history</h3>
      {transfers.length === 0 ? (
        <p className="mt-2 rounded-lg bg-[#F2F2EC] p-3 text-sm text-[#5B6660]">No transfers recorded. Still held by the issuer.</p>
      ) : (
        <ul className="mt-3 space-y-3 border-l border-[#E4E4DC] pl-4 text-sm">
          {transfers.map((t) => (
            <li key={`${t.txHash}-${t.logIndex}`} className="relative flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#0B6B4F]" />
              <span className="leading-6 text-[#3F4944]">
                <span className="font-mono text-xs text-[#5B6660]">{fmtDate(t.timestamp)}</span><br />
                {nameOf(names, t.seller)} → {nameOf(names, t.buyer)} · serials <span className="font-mono">{t.startSerial}–{t.endSerial}</span> · {formatEther(t.totalPriceWei)} ETH (testnet)
              </span>
              <a className="shrink-0 font-mono text-xs font-medium text-[#0B6B4F] underline underline-offset-2" href={explorerTx(t.txHash)} target="_blank" rel="noreferrer">Transaction ↗</a>
            </li>
          ))}
        </ul>
      )}

      {recordUrl && (
        <div className="mt-5 flex items-center gap-4 border-t border-[#E4E4DC] pt-5 text-sm text-[#5B6660]">
          <QRCodeSVG value={recordUrl} size={96} marginSize={2} level="M" className="rounded border border-[#E4E4DC] p-2" />
          <span>Scan to open this record (batch #{m.batchId}).</span>
        </div>
      )}
      </div>
    </article>
  );
}

function VerifyInner() {
  const router = useRouter();
  const urlSerial = useSearchParams().get("serial") ?? "";
  const urlBatch = useSearchParams().get("batchId"); // null = show every match
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

  // If the link names a batch, show only that record; otherwise show all matches.
  const shown = data?.found
    ? urlBatch ? data.matches.filter((m) => String(m.batchId) === urlBatch) : data.matches
    : [];

  return (
    <main className="mx-auto max-w-4xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6660]">Public registry · on-chain record lookup</p>
      <h1 className="mb-1 mt-2 font-serif text-4xl font-medium tracking-tight text-[#0E1512]">Verify a serial number</h1>
      <p className="mb-6 max-w-2xl text-sm leading-6 text-[#5B6660]">
        Prototype on the Sepolia testnet with synthetic data. We check records, not real-world carbon removal.
      </p>
      <div className="mb-8 flex flex-col gap-2 rounded-xl border border-[#E4E4DC] bg-white p-3 sm:flex-row">
        <input className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] px-4 py-2 text-sm text-[#0E1512] placeholder:text-[#5B6660] focus:border-[#0B6B4F] focus:outline-none focus:ring-2 focus:ring-[#0B6B4F]/20" inputMode="numeric" placeholder="Serial number, e.g. 1200"
          value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <button className="min-h-11 rounded-lg bg-[#0B6B4F] px-6 font-medium text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F]" onClick={go}>Look up</button>
      </div>

      {loading && <p className="rounded-lg border border-[#E4E4DC] bg-white p-4 text-sm text-[#5B6660]">Looking up serial on the registry…</p>}
      {error && <p className="rounded-lg border border-[#B42318]/30 bg-[#FDECEA] p-4 text-sm text-[#B42318]" role="alert">{error}</p>}
      {data && !data.found && (
        <p className="rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] p-4 text-sm leading-6 text-[#3F4944]">
          Not found in the index. (That does not tell us anything about the chain; the index may simply not know this serial.)
        </p>
      )}
      {data?.found && (
        <div className="space-y-4">
          {urlBatch ? (
            <p className="rounded-lg border border-[#E4E4DC] bg-white p-4 text-sm text-[#3F4944]">
              Showing batch #{urlBatch} only.{" "}
              <a className="font-medium text-[#0B6B4F] underline underline-offset-2" href={`/verify?serial=${encodeURIComponent(urlSerial)}`}>
                Show all {data.matches.length} match{data.matches.length === 1 ? "" : "es"}
              </a>
            </p>
          ) : (
            data.matches.length > 1 && <p className="text-sm text-[#5B6660]">This serial appears in {data.matches.length} different projects.</p>
          )}
          {urlBatch && shown.length === 0 && (
            <p className="rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] p-4 text-sm text-[#3F4944]">Batch #{urlBatch} does not contain serial {urlSerial} in the index.</p>
          )}
          {shown.map((m) => <Card key={m.batchId} m={m} names={names} serial={urlSerial} />)}
        </div>
      )}
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<p className="p-6">Loading…</p>}><VerifyInner /></Suspense>;
}