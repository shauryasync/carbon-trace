import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { BatchModel, ZERO_ADDRESS, toCredit } from "@/lib/models/batch";
import { findOverlap } from "@/lib/overlap";

const HASH = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const { projectId, vintage, startSerial, endSerial, evidenceHash, issuer, txHash, batchId } =
    body ?? {};

  const problems: string[] = [];
  if (typeof projectId !== "string" || !projectId.trim()) problems.push("projectId must be a non-empty string");
  if (!Number.isSafeInteger(vintage)) problems.push("vintage must be a whole number (not a string)");
  if (!Number.isSafeInteger(startSerial)) problems.push("startSerial must be a whole number (not a string)");
  if (!Number.isSafeInteger(endSerial)) problems.push("endSerial must be a whole number (not a string)");
  if (!Number.isSafeInteger(batchId) || batchId < 0) problems.push("batchId must be a whole number >= 0");
  if (typeof evidenceHash !== "string" || !HASH.test(evidenceHash)) problems.push("evidenceHash must be 0x + 64 hex characters");
  if (typeof txHash !== "string" || !HASH.test(txHash)) problems.push("txHash must be 0x + 64 hex characters");
  if (typeof issuer !== "string" || !ADDRESS.test(issuer)) problems.push("issuer must be 0x + 40 hex characters");
  if (
    Number.isSafeInteger(startSerial) &&
    Number.isSafeInteger(endSerial) &&
    (startSerial < 0 || endSerial < startSerial)
  ) {
    problems.push("serial range must satisfy 0 <= startSerial <= endSerial");
  }

  if (startSerial < 0 || endSerial < startSerial) {
    return NextResponse.json({ error: "Invalid serial range." }, { status: 400 });
  }

  try {
    await connectMongo();

    // Same rule as the contract: only batches with the EXACT same projectId count.
    const sameProject = await BatchModel.find({ projectId }).lean();
    const conflict = findOverlap({ projectId, startSerial, endSerial }, sameProject);
    if (conflict) {
      return NextResponse.json(
        {
          error: "Serial range overlaps an existing batch.",
          canRegister: false,
          conflict: toCredit(conflict),
        },
        { status: 409 },
      );
    }

    const saved = await BatchModel.create({
      batchId,
      projectId,
      vintage,
      startSerial,
      endSerial,
      evidenceHash,
      issuer,
      txHash,
      status: "issued",
      auditor: ZERO_ADDRESS,
    });

    return NextResponse.json({ credit: toCredit(saved.toObject()) }, { status: 201 });
  } catch (e) {
    // 11000 = MongoDB "duplicate key": this batchId is already indexed.
    if ((e as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: "This batchId is already saved." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}