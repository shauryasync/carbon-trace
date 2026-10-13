
export type CreditStatus = "issued" | "retired" | "flagged";

export interface CreditRecord {
  projectId: string;
  vintage: number;
  startSerial: number;
  endSerial: number;
  evidenceHash: string;
  issuer: string;
  status: CreditStatus;
  txHash: string;
  auditor: string;
}

export interface MockCredit extends CreditRecord {
  batchId: string;
}

export const mockCredits: MockCredit[] = [
  {
    batchId: "mock-1",
    projectId: "FOREST-DEMO-001",
    vintage: 2025,
    startSerial: 1001,
    endSerial: 1100,
    evidenceHash: "0x" + "a".repeat(64),
    issuer: "0x1111111111111111111111111111111111111111",
    status: "issued",
    txHash: "0x" + "b".repeat(64),
    auditor: "",
  },
  {
    batchId: "mock-2",
    projectId: "SOLAR-DEMO-002",
    vintage: 2024,
    startSerial: 2001,
    endSerial: 2050,
    evidenceHash: "0x" + "c".repeat(64),
    issuer: "0x2222222222222222222222222222222222222222",
    status: "retired",
    txHash: "0x" + "d".repeat(64),
    auditor: "0x3333333333333333333333333333333333333333",
  },
];