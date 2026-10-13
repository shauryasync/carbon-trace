"use client";

import { useState } from "react";
import { Loader2, Search, SearchX } from "lucide-react";
import type { Credit } from "./types";
import StatusCard from "./StatusCard";

interface Props {
  // Mock now, API route / contract helper later. Return null if not found.
  lookup: (serial: number) => Promise<Credit | null>;
}

export default function VerifyForm({ lookup }: Props) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ serial: number; credit: Credit | null } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const serial = Number(value);
    if (!value.trim() || !Number.isInteger(serial) || serial < 0) {
      return setError("Enter a whole-number serial, for example 1050.");
    }

    setLoading(true);
    try {
      setResult({ serial, credit: await lookup(serial) });
    } catch {
      setError("Lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="numeric"
          placeholder="Enter a serial number, e.g. 1050"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 placeholder:font-medium placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Verify
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-amber-800">
          {error}
        </p>
      )}

      {result?.credit && <StatusCard credit={result.credit} serial={result.serial} />}

      {result && !result.credit && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <SearchX className="h-6 w-6 shrink-0 text-slate-400" />
          <div className="text-sm text-slate-700">
            <p className="font-semibold">Serial {result.serial} is not in any registered batch.</p>
            <p className="mt-1 text-slate-600">It may not exist, or it hasn’t been registered yet.</p>
          </div>
        </div>
      )}
    </div>
  );
}