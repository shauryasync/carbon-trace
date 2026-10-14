import { BadgeCheck, CircleSlash, Flag, ExternalLink, UserCheck, Clock } from "lucide-react";
import { ZERO_ADDRESS, type Credit, type CreditStatus } from "./types";
import VerifyQR from "./VerifyQR";

const STATUS: Record<
  CreditStatus,
  { label: string; note: string; box: string; badge: string; Icon: typeof BadgeCheck }
> = {
  issued: {
    label: "Issued",
    note: "Registered and unique. Not yet retired.",
    box: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    Icon: BadgeCheck,
  },
  retired: {
    label: "Retired",
    note: "This credit has been used and cannot be used again.",
    box: "border-slate-300",
    badge: "bg-slate-200 text-slate-700",
    Icon: CircleSlash,
  },
  flagged: {
    label: "Flagged for review",
    note: "A reviewer raised a mismatch for a human to check. This is not a finding of fraud.",
    box: "border-amber-300",
    badge: "bg-amber-100 text-amber-800",
    Icon: Flag,
  },
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function StatusCard({ credit, serial }: { credit: Credit; serial: number }) {
  const s = STATUS[credit.status];
  const attested = credit.auditor !== ZERO_ADDRESS;

  return (
    <div className={`rounded-2xl border bg-white p-6 ${s.box}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Serial</p>
          <p className="font-mono text-2xl font-semibold">{serial}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${s.badge}`}
        >
          <s.Icon className="h-4 w-4" /> {s.label}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{s.note}</p>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Project</dt>
          <dd className="font-medium">
            {credit.projectId} · vintage {credit.vintage}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Batch range</dt>
          <dd className="font-mono">
            {credit.startSerial} – {credit.endSerial}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Issuer</dt>
          <dd className="font-mono" title={credit.issuer}>
            {short(credit.issuer)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Auditor attestation</dt>
          <dd className="flex items-center gap-1.5">
            {attested ? (
              <>
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <span className="font-mono" title={credit.auditor}>
                  {short(credit.auditor)}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Not yet attested</span>
              </>
            )}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Evidence fingerprint (hash)</dt>
          <dd className="break-all font-mono text-xs">{credit.evidenceHash}</dd>
        </div>
      </dl>
                <div className="mt-6">
        <VerifyQR serial={serial} />
      </div>
      <a
        href={`https://sepolia.etherscan.io/tx/${credit.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
      >
        View transaction on Sepolia Etherscan <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}