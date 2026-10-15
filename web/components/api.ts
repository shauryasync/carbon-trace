import {
  registerBatch,
  findBySerial,
  hashFile,
  readableError,
} from "@/lib/contract";
import { mockRegister, mockLookup } from "./mockData";
import {
  ZERO_ADDRESS,
  type Credit,
  type CreditStatus,
  type RegisterValues,
} from "./types";

// true = fake demo data, false = the real contract on Sepolia
export const USE_MOCK = false;

const STATUSES: CreditStatus[] = ["issued", "retired", "flagged"];

// Turns whatever findBySerial returns into our Credit shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCredit(raw: any): Credit {
  const status = String(raw.status ?? "").toLowerCase();
  if (!STATUSES.includes(status as CreditStatus)) {
    throw new Error(
      "Unexpected status from findBySerial. Ask the Chain owner what shape it returns."
    );
  }
  return {
    projectId: String(raw.projectId ?? ""),
    vintage: Number(raw.vintage ?? 0), // vintage is not on-chain, so 0 = unknown
    startSerial: Number(raw.startSerial ?? raw.start),
    endSerial: Number(raw.endSerial ?? raw.end),
    evidenceHash: String(raw.evidenceHash ?? ""),
    issuer: String(raw.issuer ?? ""),
    status: status as CreditStatus,
    txHash: String(raw.txHash ?? ""), // may be empty, the UI hides the link then
    auditor: String(raw.auditor ?? ZERO_ADDRESS),
  };
}

// Finds the existing batch that blocked us (checks both ends of our range).
async function findConflict(input: RegisterValues): Promise<Credit | null> {
  for (const serial of [input.startSerial, input.endSerial]) {
    const raw = await findBySerial(serial, input.projectId).catch(() => null);
    if (raw) return toCredit(raw);
  }
  return null;
}

export async function register(input: RegisterValues): Promise<Credit> {
  if (USE_MOCK) return mockRegister(input);

  if (!input.evidence) {
    throw new Error("Please choose an evidence PDF first.");
  }

  try {
    const evidenceHash = await hashFile(input.evidence);
    const { txHash } = await registerBatch(
      input.projectId,
      input.startSerial,
      input.endSerial,
      evidenceHash
    );
    const found = (await findBySerial(input.startSerial, input.projectId).catch(
      () => null
    )) as Record<string, unknown> | null;

    return {
      projectId: input.projectId,
      vintage: input.vintage,
      startSerial: input.startSerial,
      endSerial: input.endSerial,
      evidenceHash: String(evidenceHash),
      issuer: String(found?.issuer ?? ""),
      status: "issued",
      txHash: String(txHash),
      auditor: ZERO_ADDRESS,
    };
  } catch (e) {
    const message = readableError(e);
    // The demo moment: the contract refused because of an overlap.
    if (/overlap|double.?count/i.test(message)) {
      const conflict = await findConflict(input);
      if (conflict) {
        throw new Error(message);
      }
    }
    throw new Error(message); // shown by the form as a normal error
  }
}

export async function lookup(serial: number): Promise<Credit | null> {
  if (USE_MOCK) return mockLookup(serial);
  try {
    const raw = await findBySerial(serial);
    return raw ? toCredit(raw) : null;
  } catch (e) {
    throw new Error(readableError(e));
  }
}