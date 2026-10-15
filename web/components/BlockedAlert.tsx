import { ExternalLink, ShieldAlert } from "lucide-react";
import { explorerTx as etherscanTx } from "@/lib/contract";
import type { RegisterError } from "./errors";

const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;

interface Props {
  error: RegisterError;
  attempted: { projectId: string; startSerial: number; endSerial: number };
}

export default function BlockedAlert({ error, attempted }: Props) {
  const { conflict } = error;

  // The exact overlapping serials (only computable if we know the existing batch).
  const overlap = conflict
    ? {
        from: Math.max(attempted.startSerial, conflict.startSerial),
        to: Math.min(attempted.endSerial, conflict.endSerial),
      }
    : null;

  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-red-900">Blocked: double counting prevented</h3>
            <p className="mt-1 text-sm text-red-800">No batch was created.</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-red-900">Why was this blocked?</p>
            <p className="mt-1 text-sm leading-relaxed text-red-800">
              Every credit has a unique serial number, and a project can only register each serial
              once. If the same credit were registered twice, one ton of carbon removal could be
              sold twice. The registry compares your range against existing batches for{" "}
              <b>{attempted.projectId}</b> and found an overlap.
            </p>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your attempt</p>
              <p className="mt-1 font-mono">
                {attempted.startSerial} – {attempted.endSerial}
              </p>
            </div>
            <div className="rounded-xl bg-white/70 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Already registered</p>
              {conflict ? (
                <p className="mt-1 font-mono">
                  {conflict.startSerial} – {conflict.endSerial}
                </p>
              ) : (
                <p className="mt-1 text-slate-600">An existing batch with this project ID</p>
              )}
            </div>
          </div>

          {overlap && (
            <p className="text-sm text-red-900">
              Overlapping serials:{" "}
              <span className="font-mono font-semibold">
                {overlap.from} – {overlap.to}
              </span>
            </p>
          )}

          <p className="text-xs text-red-700">
            Contract message:{" "}
            <code className="rounded bg-white/70 px-1.5 py-0.5">{error.message}</code>
          </p>
          {conflict?.txHash && (
            <a
              href={etherscanTx(conflict.txHash)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-emerald-700 underline"
            >
              See the original registration on Etherscan ({shortHash(conflict.txHash)})
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}