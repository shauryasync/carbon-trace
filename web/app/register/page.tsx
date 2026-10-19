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

  const input = "mt-1 w-full rounded border border-stone-400 p-2";
  return (
    <div className="max-w-lg space-y-3">
      <label className="block text-sm">Project ID (case-sensitive)<input className={input} value={projectId} onChange={(e) => setProjectId(e.target.value)} /></label>
      <label className="block text-sm">Vintage (year, reported by you, not proven on-chain)<input className={input} inputMode="numeric" value={vintage} onChange={(e) => setVintage(e.target.value)} /></label>
      <div className="flex gap-3">
        <label className="block flex-1 text-sm">Start serial<input className={input} inputMode="numeric" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="block flex-1 text-sm">End serial<input className={input} inputMode="numeric" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      </div>
      <label className="block text-sm">Evidence file
        <input className={input} type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <span className="text-xs text-stone-600">The file is not uploaded. Only its hash (fingerprint) is stored on-chain.</span>
      </label>

      <div className="flex gap-2">
        <button onClick={precheck} className="rounded border border-stone-500 px-3 py-2">Check for overlap</button>
        <button onClick={submit} disabled={busy} className="rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50">
          {busy ? "Waiting for MetaMask / chain…" : "Register on-chain"}
        </button>
      </div>

      {overlapMsg && (overlapMsg.overlap ? (
        <div className="rounded bg-amber-100 p-3 text-sm">
          <p className="font-medium">This range overlaps an existing batch, so registering would be blocked (it would count the same serials twice).</p>
          <p>Conflict: {overlapMsg.conflict.projectId}, batch #{overlapMsg.conflict.batchId}, serials {overlapMsg.conflict.startSerial}–{overlapMsg.conflict.endSerial}.</p>
        </div>
      ) : <p className="rounded bg-stone-100 p-3 text-sm">No overlap found in the indexed batches. The contract still makes the final check.</p>)}

      {error && (
        <div className="rounded border border-red-700 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">{error}</p>
          {error.includes("Overlaps existing batch") && <p className="mt-1">Rejected by the smart contract itself. Nothing was registered.</p>}
        </div>
      )}

      {result && (
        <div className="rounded bg-emerald-50 p-3 text-sm">
          <p>Registered on-chain as batch #{result.batchId}. <a className="underline" href={explorerTx(result.txHash)} target="_blank" rel="noreferrer">View transaction</a></p>
          {!result.indexed && (
            <div className="mt-2 rounded bg-amber-100 p-2">
              <p>Registered on-chain; search index not updated yet.</p>
              {(retryError || result.indexError) && <p className="text-xs">{retryError || friendlyIndexError(result.indexError)}</p>}
              <button onClick={retry} className="mt-1 rounded border border-stone-500 px-2 py-1">Retry</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Register a credit batch</h1>
      <p className="mb-4 text-sm text-stone-700">Prototype on the Sepolia testnet with synthetic data. Registering records a serial range; it does not prove any carbon was removed.</p>
      <AuthGuard>{() => <RegisterForm />}</AuthGuard>
    </main>
  );
}
