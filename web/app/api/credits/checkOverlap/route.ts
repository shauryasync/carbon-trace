import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { BatchModel, toCredit } from "@/lib/models/batch";
import { findOverlap } from "@/lib/overlap";

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const { projectId, startSerial, endSerial } = body ?? {};

  if (
    typeof projectId !== "string" ||
    !projectId.trim() ||
    !Number.isSafeInteger(startSerial) ||
    !Number.isSafeInteger(endSerial) ||
    startSerial < 0 ||
    endSerial < startSerial
  ) {
    return NextResponse.json(
      { error: "Provide projectId and a valid range: 0 <= startSerial <= endSerial." },
      { status: 400 },
    );
  }

  try {
    await connectMongo();
    const sameProject = await BatchModel.find({ projectId }).lean();
    const conflict = findOverlap({ projectId, startSerial, endSerial }, sameProject);

    return NextResponse.json({
      projectId,
      startSerial,
      endSerial,
      overlap: conflict !== null,
      canRegister: conflict === null,
      conflict: conflict ? toCredit(conflict) : null,
      message: conflict
        ? "This serial range overlaps an existing batch."
        : "No overlap found in the indexed batches.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}