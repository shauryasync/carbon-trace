"use client";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { friendlyIndexError, httpMessage } from "@/components/format";
import { explorerTx, hashFile, indexBatch, readableError, registerBatch } from "@/lib/contract";

type Result = Awaited<ReturnType<typeof registerBatch>>;

function RegisterForm() {
  const [projectId, setProjectId] = useState("");
  const [vintage, setVintage] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [overlapMsg, setOverlapMsg] = useState<any>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [retryError, setRetryError] = useState("");

  // Optional friendly pre-check. The contract is still the real gate.
  async function precheck() {
    setError(""); setOverlapMsg(null);
    try {
      const res = await fetch("/api/credits/checkOverlap", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: projectId.trim(), startSerial: Number(start), endSerial: Number(end) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setError(httpMessage(res.status, data));
      setOverlapMsg(data);
    } catch { setError("Something went wrong on our side. Try again."); }
  }

  async function submit() {
    setError(""); setResult(null); setRetryError("");
    if (!file) return setError("Please choose an evidence file.");
    setBusy(true);
    try {
      const evidenceHash = await hashFile(file); // only the fingerprint goes on-chain
      setResult(await registerBatch(projectId.trim(), Number(start), Number(end), evidenceHash, { vintage: Number(vintage) }));
    } catch (e) {
      setError(readableError(e)); // shows the contract's revert text exactly
    } finally { setBusy(false); }
  }

  async function retry() {
    if (!result) return;
    setRetryError("");
    const r = await indexBatch(result.payload); // always safe to repeat
    if (r.indexed) setResult({ ...result, indexed: true, indexError: null });
    else setRetryError(friendlyIndexError(r.indexError));
  }

  const input = "mt-2 min-h-11 w-full rounded-lg border border-[#E4E4DC] bg-[#F2F2EC] px-3 py-2 text-sm text-[#0E1512] focus:border-[#0B6B4F] focus:outline-none focus:ring-2 focus:ring-[#0B6B4F]/20";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
      <section className="space-y-5 rounded-xl border border-[#E4E4DC] bg-white p-5 sm:p-7">
        <div className="border-b border-[#E4E4DC] pb-4">
          <h2 className="font-serif text-2xl font-medium text-[#0E1512]">Credit batch specifications</h2>
          <p className="mt-1 text-sm leading-5 text-[#5B6660]">All serials are contiguous, non-negative integers registered against the project ID.</p>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">Project ID (case-sensitive)<input className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)} /></label>
        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">Vintage year <span className="font-normal normal-case tracking-normal text-[#8A6D1D]">· issuer-reported</span><input className={input} inputMode="numeric" value={vintage} onChange={(e) => setVintage(e.target.value)} /></label>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">Contiguous serial range</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-[#5B6660]">Start serial (inclusive)<input className={input} inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="block text-xs text-[#5B6660]">End serial (inclusive)<input className={input} inputMode="numeric" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#5B6660]">Strict monotonic range: start serial ≤ end serial. Each integer corresponds to 1 metric ton recorded.</p>
        </div>
        <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-[#3F4944]">Evidence &amp; audit documents
          <input className={`${input} file:mr-3 file:rounded-md file:border-0 file:bg-[#E3F1EB] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#0B6B4F]`} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <span className="mt-1 block text-xs font-normal normal-case tracking-normal text-[#5B6660]">The file is not uploaded. Only its hash (fingerprint) is stored on-chain.</span>
        </label>

        <div className="flex flex-col gap-3 border-t border-[#E4E4DC] pt-4 sm:flex-row">
          <button onClick={precheck} className="min-h-11 rounded-lg border border-[#E4E4DC] bg-white px-4 py-2 text-sm font-medium text-[#0E1512] transition-colors hover:bg-[#F2F2EC] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F]">Check for overlap</button>
          <button onClick={submit} disabled={busy} className="min-h-11 rounded-lg bg-[#0B6B4F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00513A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B6B4F] disabled:opacity-50">
            {busy ? "Waiting for MetaMask / chain…" : "Register on-chain"}
          </button>
        </div>
        <p className="text-xs text-[#5B6660]">The contract makes the final overlap check and records the evidence fingerprint.</p>
      </section>
      <aside className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#3F4944]">Registry checks</p>
        {overlapMsg && (overlapMsg.overlap ? (
          <div className="rounded-xl border border-[#B42318]/40 bg-[#FDECEA] p-4 text-sm text-[#0E1512]">
            <p className="font-serif text-lg font-medium text-[#B42318]">Overlap detected</p>
            <p className="mt-2 leading-6">This range overlaps an existing batch, so registering would be blocked (it would count the same serials twice).</p>
            <p className="mt-3 rounded-md border border-[#B42318]/20 bg-white/70 p-3 font-mono text-xs">Conflict: {overlapMsg.conflict.projectId}, batch #{overlapMsg.conflict.batchId}, serials {overlapMsg.conflict.startSerial}–{overlapMsg.conflict.endSerial}.</p>
          </div>
        ) : <p className="rounded-xl border border-[#E4E4DC] bg-[#F2F2EC] p-4 text-sm leading-6 text-[#3F4944]">No overlap found in the indexed batches. The contract still makes the final check.</p>)}

        {error && (
          <div className="rounded-xl border border-[#B42318]/30 bg-[#FDECEA] p-4 text-sm text-[#B42318]" role="alert">
            <p className="font-medium">{error}</p>
            {error.includes("Overlaps existing batch") && <p className="mt-2 text-xs">Rejected by the smart contract itself. Nothing was registered.</p>}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-[#15803D]/20 bg-[#E6F4EA] p-4 text-sm text-[#0E1512]">
            <p>Registered on-chain as batch <span className="font-mono font-semibold">#{result.batchId}</span>. <a className="font-medium text-[#0B6B4F] underline underline-offset-2" href={explorerTx(result.txHash)} target="_blank" rel="noreferrer">View transaction</a></p>
            {!result.indexed && (
              <div className="mt-3 rounded-lg border border-[#8A6D1D]/20 bg-[#FBF3DC] p-3">
                <p>Registered on-chain; search index not updated yet.</p>
                {(retryError || result.indexError) && <p className="mt-1 text-xs text-[#8A6D1D]">{retryError || friendlyIndexError(result.indexError)}</p>}
                <button onClick={retry} className="mt-2 min-h-10 rounded-md border border-[#E4E4DC] bg-white px-3 py-1 text-sm font-medium text-[#0E1512]">Retry</button>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-5xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5B6660]">Protocol pipeline · batch creation</p>
      <h1 className="mt-2 font-serif text-4xl font-medium tracking-tight text-[#0E1512]">Register a credit batch</h1>
      <p className="mb-7 mt-2 max-w-3xl text-sm leading-6 text-[#5B6660]">Prototype on the Sepolia testnet with synthetic data. Registering records a serial range and stores an evidence fingerprint on-chain; it does not prove any real-world carbon was removed.</p>
      <AuthGuard>{() => <RegisterForm />}</AuthGuard>
    </main>
  );
}
