"use client";
import { useEffect, useSyncExternalStore } from "react";
import { getMe, logout, type CompanyProfile } from "@/lib/auth-client";

// One shared login state for the whole app (Navbar, HeroButtons, AuthGuard,
// AuthPanel, LoginBox). Any component that calls setCompany updates all of them,
// so the navbar changes the moment a login or logout happens.
type State = { company: CompanyProfile | null; checked: boolean };

const SERVER_STATE: State = { company: null, checked: false };
let state: State = SERVER_STATE;
let started = false;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function setCompany(c: CompanyProfile | null) {
  emit({ company: c, checked: true });
}

// Asks the server who is logged in (cookie) once per page load.
function load() {
  if (started) return;
  started = true;
  getMe()
    .then((c) => emit({ company: c, checked: true }))
    .catch(() => emit({ company: null, checked: true }));

  // If the user switches account in MetaMask, drop the login for the old wallet.
  const eth = (window as any).ethereum;
  eth?.on?.("accountsChanged", (accounts: string[]) => {
    const current = state.company;
    if (current && accounts[0]?.toLowerCase() !== current.address.toLowerCase()) {
      logout().finally(() => setCompany(null));
    }
  });
}

export function useCompany() {
  const s = useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
  useEffect(() => {
    load();
  }, []);
  return { company: s.company, checked: s.checked, setCompany };
}