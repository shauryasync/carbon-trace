"use client";
import { useState } from "react";
import { Profile, ProfileRole } from "./types";

const ROLES: ProfileRole[] = ["Project developer", "Auditor", "Buyer / viewer", "Other"];

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

interface Props {
  initial: Profile;
  onSave: (p: Profile) => void | Promise<void>;
}

export default function ProfileForm({ initial, onSave }: Props) {
  const [p, setP] = useState<Profile>(initial);

  return (
    <form
      onSubmit={async (e) => { e.preventDefault(); await onSave(p); }}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm"
    >
      <label className="block text-sm font-medium">
        Display name
        <input className={inputCls} value={p.displayName} onChange={(e) => setP({ ...p, displayName: e.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        Company / organisation
        <input className={inputCls} value={p.organisation} onChange={(e) => setP({ ...p, organisation: e.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        Role
        <select className={inputCls} value={p.role} onChange={(e) => setP({ ...p, role: e.target.value as ProfileRole })}>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <p className="text-xs text-amber-700">
        Self-declared and not verified. Real issuers and auditors are shown by their on-chain address.
      </p>
      <button className="w-full rounded-lg bg-emerald-700 py-2.5 font-medium text-white hover:bg-emerald-800">
        Save and continue
      </button>
    </form>
  );
}