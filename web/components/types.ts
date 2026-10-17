// Matches the team's shared data format exactly.
export type CreditStatus = "issued" | "retired" | "flagged";

export interface Credit {
  projectId: string;
  vintage: number;
  startSerial: number;
  endSerial: number;
  evidenceHash: string;
  issuer: string;
  status: CreditStatus;
  txHash: string;
  auditor: string; // zero address until an approved auditor attests
}

export interface RegisterValues {
  projectId: string;
  vintage: number;
  startSerial: number;
  endSerial: number;
  evidence: File;
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export type ProfileRole = "Project developer" | "Auditor" | "Buyer / viewer" | "Other";

export interface Profile {
  displayName: string;
  organisation: string;
  role: ProfileRole;
}