// Small helpers shared by the pages. No wallet code in here.

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const fmtDate = (seconds: number) => new Date(seconds * 1000).toLocaleString();

// Compare wallet addresses ignoring upper/lower case.
export const sameAddr = (a?: string, b?: string) =>
  !!a && !!b && a.toLowerCase() === b.toLowerCase();

// Turn an HTTP status into the message the brief asks for.
export function httpMessage(status: number, data: any): string {
  if (status === 400) {
    if (Array.isArray(data?.problems) && data.problems.length) return data.problems.join(" ");
    return data?.error || "That request was not valid.";
  }
  if (status === 401) return "Please log in with your wallet.";
  if (status === 403) return "You are logged in with a different wallet than the one that issued this batch.";
  if (status === 404) return "Transaction not found on Sepolia yet. Wait a few seconds and retry.";
  if (status === 422) return "That transaction does not contain what we expected.";
  return "Something went wrong on our side. Try again.";
}

// indexBatch / indexTransfer return the raw response text (not the status code),
// so we read the `error` out of that text.
export function friendlyIndexError(text: string | null): string {
  if (!text) return "";
  try {
    const d = JSON.parse(text);
    if (/not logged in/i.test(d?.error || "")) return "Please log in with your wallet.";
    return d?.error || (Array.isArray(d?.problems) ? d.problems.join(" ") : text);
  } catch {
    return text;
  }
}

// ONE call for all addresses (max 20). Returns { lowercaseAddress: name }.
// Never throws: if it fails we just show short addresses.
export async function fetchCompanies(addresses: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(addresses.filter(Boolean))].slice(0, 20);
  if (!unique.length) return {};
  try {
    const res = await fetch(`/api/companies?addresses=${unique.join(",")}`);
    if (!res.ok) return {};
    const { companies } = await res.json();
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(companies || {})) out[k.toLowerCase()] = v as string;
    return out;
  } catch {
    return {};
  }
}

// "Acme (self-declared)" or a short address.
export const nameOf = (names: Record<string, string>, addr: string) =>
  names[addr.toLowerCase()] ? `${names[addr.toLowerCase()]} (self-declared)` : short(addr);
