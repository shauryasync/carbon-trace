"use client";

import RegisterForm from "@/components/RegisterForm";
import { register } from "@/components/api";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-white">Register a credit batch</h1>
      <p className="mt-1 mb-6 text-sm text-white/80">
        Records a serial range and an evidence fingerprint on-chain. Prototype with synthetic data.
      </p>
      <RegisterForm onSubmit={register} />
    </div>
  );
}