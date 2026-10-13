import type { Credit } from "./types";

export type RegisterErrorKind = "overlap" | "badRange" | "rejected" | "unknown";

// The exact revert strings from the contract.
const OVERLAP = "Overlaps existing batch: double counting blocked!";
const BAD_RANGE = "Bad range: start must be <= end";

export class RegisterError extends Error {
  kind: RegisterErrorKind;
  conflict?: Credit; // the existing batch we collided with, if known

  constructor(kind: RegisterErrorKind, message: string, conflict?: Credit) {
    super(message);
    this.kind = kind;
    this.conflict = conflict;
  }
}

// Turns whatever ethers / the API throws into a RegisterError.
// Revert strings can appear in different fields depending on the error,
// so we search all of them.
export function toRegisterError(err: unknown): RegisterError {
  if (err instanceof RegisterError) return err;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  const text = [e?.reason, e?.shortMessage, e?.message, e?.info?.error?.message, e?.data?.message]
    .filter((s) => typeof s === "string")
    .join(" | ");

  if (text.includes(OVERLAP)) return new RegisterError("overlap", OVERLAP);
  if (text.includes(BAD_RANGE)) return new RegisterError("badRange", BAD_RANGE);
  if (e?.code === "ACTION_REJECTED") {
    return new RegisterError("rejected", "You rejected the transaction in MetaMask.");
  }
  return new RegisterError("unknown", text || "Something went wrong.");
}