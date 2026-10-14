"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, AlertTriangle, Loader2 } from "lucide-react";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  removeListener?: (event: string, handler: (...args: any[]) => void) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
};

const getEthereum = (): Eip1193 | undefined =>
  (window as unknown as { ethereum?: Eip1193 }).ethereum;

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function WalletButton() {
  const [mounted, setMounted] = useState(false); // avoids server/client mismatch
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore an existing connection without opening a popup, and listen for changes.
  useEffect(() => {
    setMounted(true);
    const eth = getEthereum();
    if (!eth) return;

    eth.request({ method: "eth_accounts" }).then((accs) => setAccount((accs as string[])[0] ?? null)).catch(() => {});
    eth.request({ method: "eth_chainId" }).then((id) => setChainId(id as string)).catch(() => {});

    const onAccounts = (accs: string[]) => setAccount(accs[0] ?? null);
    const onChain = (id: string) => setChainId(id);
    eth.on?.("accountsChanged", onAccounts);
    eth.on?.("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    setBusy(true);
    setError(null);
    try {
      const accs = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accs[0] ?? null);
      setChainId((await eth.request({ method: "eth_chainId" })) as string);
    } catch (e) {
      const code = (e as { code?: number }).code;
      setError(code === 4001 ? "Connection cancelled." : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }, []);

  const switchToSepolia = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) return;
    setBusy(true);
    setError(null);
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch {
      setError("Please switch to Sepolia in MetaMask.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!mounted) return <div className="h-9 w-36" aria-hidden />;

  const base =
    "ml-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition";

  if (!getEthereum()) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} border border-slate-300 text-slate-700 hover:bg-slate-100`}
      >
        <Wallet className="h-4 w-4" /> Install MetaMask
      </a>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center">
        <button
          onClick={connect}
          disabled={busy}
          className={`${base} bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          Connect wallet
        </button>
        {error && <span className="ml-2 text-xs text-amber-800">{error}</span>}
      </div>
    );
  }

  if (chainId !== SEPOLIA_CHAIN_ID) {
    return (
      <div className="flex items-center">
        <button
          onClick={switchToSepolia}
          disabled={busy}
          className={`${base} bg-amber-100 text-amber-900 hover:bg-amber-200 disabled:opacity-60`}
        >
          <AlertTriangle className="h-4 w-4" /> Switch to Sepolia
        </button>
        {error && <span className="ml-2 text-xs text-amber-800">{error}</span>}
      </div>
    );
  }

  return (
    <span className={`${base} bg-emerald-50 text-emerald-800`} title={account}>
      <span className="h-2 w-2 rounded-full bg-emerald-500" /> {short(account)} · Sepolia
    </span>
  );
}