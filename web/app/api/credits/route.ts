import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { BatchModel, toCredit } from "@/lib/models/batch";

// Makes user text safe to use inside a regex.
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/credits?serial=1500            -> batches containing serial 1500
// GET /api/credits?serial=1500&projectId=KENYA-001
// GET /api/credits?query=kenya            -> projects whose id contains "kenya"
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const serialRaw = params.get("serial");
  const projectId = params.get("projectId");
  const query = params.get("query") ?? "";

  const filter: Record<string, unknown> = {};

  if (serialRaw !== null) {
    const serial = Number(serialRaw);
    if (!serialRaw.trim() || !Number.isSafeInteger(serial) || serial < 0) {
      return NextResponse.json({ error: "serial must be a whole number." }, { status: 400 });
    }
    filter.startSerial = { $lte: serial };
    filter.endSerial = { $gte: serial };
  }

  if (projectId) {
    filter.projectId = projectId; // exact match, like the contract
  } else if (query) {
    filter.projectId = { $regex: escapeRegex(query), $options: "i" };
  }

  try {
    await connectMongo();
    const docs = await BatchModel.find(filter).sort({ batchId: 1 }).limit(50).lean();
    return NextResponse.json({ count: docs.length, credits: docs.map(toCredit) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}