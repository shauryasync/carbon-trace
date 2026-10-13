import { NextRequest, NextResponse } from "next/server";
import { mockCredits } from "@/lib/mockData";
import { hasOverlap } from "@/lib/overlap";

export async function POST(request: NextRequest) {
try {
const body = await request.json();
const { projectId, startSerial, endSerial } = body;

if (
  typeof projectId !== "string" ||
  !projectId.trim() ||
  !Number.isSafeInteger(startSerial) ||
  !Number.isSafeInteger(endSerial)
) {
  return NextResponse.json(
    { error: "Provide projectId, startSerial and endSerial with valid values." },
    { status: 400 },
  );
}

if (startSerial < 0 || endSerial < startSerial) {
  return NextResponse.json(
    { error: "Invalid serial range: startSerial must be <= endSerial and non-negative." },
    { status: 400 },
  );
}

const existingBatches = mockCredits.filter(
  (credit) =>
    credit.projectId.toLowerCase() === projectId.trim().toLowerCase(),
);

const overlap = hasOverlap(
  startSerial,
  endSerial,
  existingBatches,
);

return NextResponse.json({
  mode: "development",
  projectId: projectId.trim(),
  startSerial,
  endSerial,
  overlap,
  canRegister: !overlap,
  message: overlap
    ? "This serial range overlaps an existing batch."
    : "No overlap found in the current mock data.",
});

} catch {
return NextResponse.json(
{ error: "Invalid JSON request body." },
{ status: 400 },
);
}
}