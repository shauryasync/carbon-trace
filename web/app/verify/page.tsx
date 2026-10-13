"use client";

import VerifyForm from "@/components/VerifyForm";
import { mockLookup } from "@/components/mockData";

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Verify a credit</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Look up a serial number to see its status, issuer and auditor. Prototype with synthetic data.
      </p>
      {/* Later: swap mockLookup for the Backend API route in web/app/api */}
      <VerifyForm lookup={mockLookup} />
    </div>
  );
}