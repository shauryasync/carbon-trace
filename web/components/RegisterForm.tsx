"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Upload, AlertTriangle } from "lucide-react";
import type { Credit, RegisterValues } from "./types";
import { RegisterError, toRegisterError } from "./errors";
import BlockedAlert from "./BlockedAlert";

interface Props {
  // Mock now, real contract helper later. Throw to signal failure.
  onSubmit: (values: RegisterValues) => Promise<Credit>;
}

const input =
  "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function RegisterForm({ onSubmit }: Props) {
  const [projectId, setProjectId] = useState("");
  const [vintage, setVintage] = useState("2024");
  const [startSerial, setStart] = useState("");
  const [endSerial, setEnd] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [failure, setFailure] = useState<RegisterError | null>(null);
  const [success, setSuccess] = useState<Credit | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFailure(null);
    setSuccess(null);

    const start = Number(startSerial);
    const end = Number(endSerial);

    if (!projectId.trim()) return setFormError("Project ID is required.");
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < 0)
      return setFormError("Serials must be whole numbers.");
    if (start > end) return setFormError("Start serial must be less than or equal to end serial.");
    if (!file) return setFormError("Please upload the evidence PDF.");
    if (file.type !== "application/pdf") return setFormError("Evidence must be a PDF file.");

    setLoading(true);
    try {
      const credit = await onSubmit({
        projectId: projectId.trim(),
        vintage: Number(vintage),
        startSerial: start,
        endSerial: end,
        evidence: file,
      });
      setSuccess(credit);
    } catch (err) {
      setFailure(toRegisterError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Project ID
            <input
              className={input}
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="DEMO-KENYA-001"
            />
          </label>
          <label className="block text-sm font-medium">
            Vintage (year)
            <input
              className={input}
              type="number"
              value={vintage}
              onChange={(e) => setVintage(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium">
            Start serial
            <input
              className={input}
              type="number"
              value={startSerial}
              onChange={(e) => setStart(e.target.value)}
              placeholder="1050"
            />
          </label>
          <label className="block text-sm font-medium">
            End serial
            <input
              className={input}
              type="number"
              value={endSerial}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="1150"
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Evidence PDF
          <div className="mt-1 flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
            <Upload className="h-5 w-5 text-slate-500" />
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-emerald-700"
            />
          </div>
        </label>

        {formError && (
          <p className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4" /> {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Registering..." : "Register batch"}
        </button>
      </form>

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="text-sm text-emerald-900">
            <p className="font-semibold">Batch registered</p>
            <p className="mt-1">
              {success.projectId}, serials {success.startSerial} – {success.endSerial}. You can now
              look any of them up on the Verify page.
            </p>
          </div>
        </div>
      )}

      {failure?.kind === "overlap" && (
        <BlockedAlert
          error={failure}
          attempted={{
            projectId: projectId.trim(),
            startSerial: Number(startSerial),
            endSerial: Number(endSerial),
          }}
        />
      )}

      {failure && failure.kind !== "overlap" && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">
            {failure.kind === "badRange"
              ? "Invalid serial range"
              : failure.kind === "rejected"
              ? "Transaction cancelled"
              : "Registration failed"}
          </p>
          <p className="mt-1">{failure.message}</p>
        </div>
      )}
    </div>
  );
}