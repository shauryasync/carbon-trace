"use client";
import { useEffect, useState } from "react";
import { getMe, type CompanyProfile } from "@/lib/auth-client";

// Asks the server who is logged in. `checked` is false while we wait.
export function useCompany() {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    getMe().then(setCompany).catch(() => setCompany(null)).finally(() => setChecked(true));
  }, []);
  return { company, setCompany, checked };
}
