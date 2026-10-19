export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type CreditStatus = "issued" | "retired" | "flagged";

export type ProfileRole = "Project developer" | "Auditor" | "Buyer / viewer" | "Other";

export type Profile = {
  displayName: string;
  organisation: string;
  role: ProfileRole;
};

export type RegisterValues = {
  projectId: string;
  vintage: number;
  startSerial: number;
  endSerial: number;
  evidence: File | null;
};

export type Credit = {
  projectId: string;
  vintage: number;
  startSerial: number;
  endSerial: number;
  evidenceHash: string;
  issuer: string;
  status: CreditStatus;
  txHash: string;
  auditor: string;
};

// Shapes copied from web/IMPLEMENTATION.md (GET /api/serials, GET /api/transfers).
export type Transfer = {
  txHash: string; logIndex: number; listingId: number; batchId: number;
  seller: string; buyer: string; startSerial: number; endSerial: number;
  totalPriceWei: string; blockNumber: number; timestamp: number; // timestamp = seconds
};

export type SerialMatch = {
  batchId: number; projectId: string; vintage: number;
  startSerial: number; endSerial: number; evidenceHash: string;
  issuer: string; status: CreditStatus;
  statusSource: string; txHash: string; auditor: string | null;
  owner: string; ownerSource: string;
  ownershipConfirmedOnChain: boolean | null;
  chain: { checked: boolean; retired?: boolean; auditor?: string | null; ownerHoldsSerial?: boolean; error?: string };
  transfers: Transfer[];
  warning?: string;
};

export type SerialResult = { serial: number; found: boolean; matches: SerialMatch[]; message?: string };
