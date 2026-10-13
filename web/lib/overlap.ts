export function hasOverlap(
  start: number,
  end: number,
  existing: { startSerial: number; endSerial: number }[],
): boolean {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start
  ) {
    throw new Error("Invalid serial range");
  }

  return existing.some(
    (batch) =>
      start <= batch.endSerial &&
      end >= batch.startSerial
  );
}