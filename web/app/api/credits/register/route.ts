
import { NextRequest, NextResponse } from "next/server";
import { mockCredits } from "@/lib/mockData";
import { hasOverlap } from "@/lib/overlap";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      projectId,
      vintage,
      startSerial,
      endSerial,
      evidenceHash,
      issuer,
    } = body;

    // Validate required fields
    if (
      typeof projectId !== "string" ||
      !projectId.trim() ||
      !Number.isSafeInteger(vintage) ||
      !Number.isSafeInteger(startSerial) ||
      !Number.isSafeInteger(endSerial) ||
      typeof evidenceHash !== "string" ||
      !/^0x[a-fA-F0-9]{64}$/.test(evidenceHash) ||
      typeof issuer !== "string" ||
      !/^0x[a-fA-F0-9]{40}$/.test(issuer)
    ) {
      return NextResponse.json(
        { error: "Invalid or missing registration fields." },
        { status: 400 },
      );
    }

    if (
      startSerial < 0 ||
      endSerial < startSerial
    ) {
      return NextResponse.json(
        { error: "Invalid serial range." },
        { status: 400 },
      );
    }

    // Check overlap within the same project
    const existingBatches = mockCredits.filter(
      (credit) =>
        credit.projectId.toLowerCase() ===
        projectId.trim().toLowerCase(),
    );

    if (hasOverlap(startSerial, endSerial, existingBatches)) {
      return NextResponse.json(
        {
          error: "Serial range overlaps an existing batch.",
          canRegister: false,
        },
        { status: 409 },
      );
    }

    // Mock mode: no database write or blockchain transaction
    return NextResponse.json(
      {
        mode: "development",
        simulated: true,
        persisted: false,
        proposedBatch: {
          projectId: projectId.trim(),
          vintage,
          startSerial,
          endSerial,
          evidenceHash,
          issuer,
        },
        transaction: {
          submitted: false,
          batchId: null,
          txHash: null,
        },
        message:
          "Validation passed. Real registration requires database and smart-contract integration.",
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }
}