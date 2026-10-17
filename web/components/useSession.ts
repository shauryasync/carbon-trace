"use client";
import { useEffect, useState } from "react";

const KEY = "carbon-trace-session";
const EVENT = "carbon-session";

export function setSession(address: string) {
  try { localStorage.setItem(KEY, address); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  try { localStorage.removeItem(KEY); } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function useSession() {
  const [address, setAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => {
      try { setAddress(localStorage.getItem(KEY)); } catch { setAddress(null); }
      setReady(true);
    };
    read();
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as any).ethereum;
    const onAccounts = (a: string[]) => {
      const current = localStorage.getItem(KEY);
      if (current && a[0]?.toLowerCase() !== current.toLowerCase()) clearSession();
    };
    eth?.on?.("accountsChanged", onAccounts);

    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
      eth?.removeListener?.("accountsChanged", onAccounts);
    };
  }, []);

  return { address, ready, loggedIn: !!address };
}