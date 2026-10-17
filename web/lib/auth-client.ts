import { BrowserProvider } from "ethers";

export type CompanyProfile = { address: string; name: string };

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// Opens MetaMask, asks the wallet to sign, and logs in.
// Pass companyName on the first login (a form field is easiest).
export async function loginWithWallet(companyName?: string): Promise<CompanyProfile> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found. Please install it.");

  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const signer = await new BrowserProvider(eth).getSigner();
  const address = await signer.getAddress();
  if (!accounts.length) throw new Error("No wallet account selected.");

  const challenge = await post("/api/auth/nonce", { address });
  if (!challenge.ok) throw new Error(challenge.data.error || "Could not start login.");

  const signature = await signer.signMessage(challenge.data.message);

  const verified = await post("/api/auth/verify", { address, signature, companyName });
  if (!verified.ok) {
    const err = new Error(verified.data.error || "Login failed.") as Error & { needsCompanyName?: boolean };
    err.needsCompanyName = !!verified.data.needsCompanyName;
    throw err;
  }
  return verified.data.company;
}

export async function getMe(): Promise<CompanyProfile | null> {
  const res = await fetch("/api/auth/me");
  if (!res.ok) return null;
  return (await res.json()).company;
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}