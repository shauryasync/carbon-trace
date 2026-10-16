export type SerialRange = {
  projectId: string;
  startSerial: number;
  endSerial: number;
};

function assertValidRange(start: number, end: number) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start) {
    throw new Error("Invalid serial range");
  }
}

// Same rule as the contract: ranges are inclusive, so sharing one serial counts.
export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

// Returns the first existing batch that conflicts, or null.
// projectId is compared EXACTLY (no lowercasing), like the contract.
export function findOverlap<T extends SerialRange>(proposed: SerialRange, existing: T[]): T | null {
  assertValidRange(proposed.startSerial, proposed.endSerial);
  return (
    existing.find(
      (b) =>
        b.projectId === proposed.projectId &&
        rangesOverlap(proposed.startSerial, proposed.endSerial, b.startSerial, b.endSerial),
    ) ?? null
  );
}

// Kept so the current routes keep working. It does NOT check projectId.
// Prefer findOverlap in new code.
export function hasOverlap(
  start: number,
  end: number,
  existing: { startSerial: number; endSerial: number }[],
): boolean {
  assertValidRange(start, end);
  return existing.some((b) => rangesOverlap(start, end, b.startSerial, b.endSerial));
}