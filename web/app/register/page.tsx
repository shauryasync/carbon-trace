"use client";

import RegisterForm from "@/components/RegisterForm";
import { mockRegister } from "@/components/mockData";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Register a credit batch</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        Records a serial range and an evidence fingerprint on-chain. Prototype with synthetic data.
      </p>
      {/* Later: swap mockRegister for the helper in web/lib/contract.ts */}
      <RegisterForm onSubmit={mockRegister} />
    </div>
  );
}