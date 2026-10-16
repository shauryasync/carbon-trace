import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { BatchModel, toCredit } from "@/lib/models/batch";

type RouteContext = { params: Promise<{ batchId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { batchId } = await context.params;

  // batchId is the on-chain id: 0, 1, 2...
  const id = Number(batchId);
  if (!Number.isSafeInteger(id) || id < 0) {
    return NextResponse.json({ error: "batchId must be a whole number.", batchId }, { status: 400 });
  }

  try {
    await connectMongo();
    const doc = await BatchModel.findOne({ batchId: id }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Credit batch not found", batchId }, { status: 404 });
    }
    return NextResponse.json({ credit: toCredit(doc) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}