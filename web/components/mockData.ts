import type { Credit, RegisterValues } from "./types";
import { ZERO_ADDRESS } from "./types";
import { RegisterError } from "./errors";

// SYNTHETIC DATA. These tx hashes are fake, so Etherscan will say "not found".
const fakeTx = (n: number) => "0x" + n.toString(16).padStart(64, "a");
const fakeHash = (n: number) => "0x" + n.toString(16).padStart(64, "b");

export const mockCredits: Credit[] = [
  {
    projectId: "DEMO-KENYA-001",
    vintage: 2024,
    startSerial: 1000,
    endSerial: 1099,
    evidenceHash: fakeHash(1),
    issuer: "0x1111111111111111111111111111111111111111",
    status: "issued",
    txHash: fakeTx(1),
    auditor: "0x2222222222222222222222222222222222222222",
  },
  {
    projectId: "DEMO-PERU-002",
    vintage: 2023,
    startSerial: 2000,
    endSerial: 2049,
    evidenceHash: fakeHash(2),
    issuer: "0x3333333333333333333333333333333333333333",
    status: "retired",
    txHash: fakeTx(2),
    auditor: "0x2222222222222222222222222222222222222222",
  },
  {
    projectId: "DEMO-INDIA-003",
    vintage: 2024,
    startSerial: 3000,
    endSerial: 3019,
    evidenceHash: fakeHash(3),
    issuer: "0x4444444444444444444444444444444444444444",
    status: "flagged",
    txHash: fakeTx(3),
    auditor: ZERO_ADDRESS,
  },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Mimics lookup. Replace later with the Backend teammate's API route.
export async function mockLookup(serial: number): Promise<Credit | null> {
  await wait(600);
  return mockCredits.find((c) => serial >= c.startSerial && serial <= c.endSerial) ?? null;
}

// Mimics registerBatch. Like the contract, it only blocks overlaps within the SAME projectId.
// Replace later with the Chain owner's helper in web/lib/contract.ts.
export async function mockRegister(v: RegisterValues): Promise<Credit> {
  await wait(1200);

  if (v.startSerial > v.endSerial) {
    throw new RegisterError("badRange", "Bad range: start must be <= end");
  }
  const conflict = mockCredits.find(
    (c) =>
      c.projectId === v.projectId &&
      v.startSerial <= c.endSerial &&
      v.endSerial >= c.startSerial
  );
  if (conflict) {
    throw new RegisterError("overlap", "Overlaps existing batch: double counting blocked!", conflict);
  }

  const created: Credit = {
    projectId: v.projectId,
    vintage: v.vintage,
    startSerial: v.startSerial,
    endSerial: v.endSerial,
    evidenceHash: fakeHash(mockCredits.length + 1),
    issuer: "0x5555555555555555555555555555555555555555",
    status: "issued",
    txHash: fakeTx(mockCredits.length + 1),
    auditor: ZERO_ADDRESS,
  };
  mockCredits.push(created); // in memory only, resets on reload
  return created;
}