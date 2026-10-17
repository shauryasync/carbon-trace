import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "ethers";
import { connectMongo } from "@/lib/mongo";
import { TransferModel, toTransfer } from "@/lib/models/transfer";

// GET /api/transfers?serial=1200            -> transfers whose range contains 1200
// GET /api/transfers?batchId=0
// GET /api/transfers?address=0x...          -> where this wallet sold OR bought
// GET /api/transfers?txHash=0x...
// Filters can be combined. Newest first, up to 50.
export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};

  const serialRaw = p.get("serial");
  if (serialRaw !== null) {
    const serial = Number(serialRaw);
    if (!serialRaw.trim() || !Number.isSafeInteger(serial) || serial < 0) {
      return NextResponse.json({ error: "serial must be a whole number." }, { status: 400 });
    }
    filter.startSerial = { $lte: serial };
    filter.endSerial = { $gte: serial };
  }

  const batchRaw = p.get("batchId");
  if (batchRaw !== null) {
    const batchId = Number(batchRaw);
    if (!batchRaw.trim() || !Number.isSafeInteger(batchId) || batchId < 0) {
      return NextResponse.json({ error: "batchId must be a whole number." }, { status: 400 });
    }
    filter.batchId = batchId;
  }

  const addressRaw = p.get("address");
  if (addressRaw) {
    try {
      const a = getAddress(addressRaw); // accepts any casing, returns the standard form
      filter.$or = [{ seller: a }, { buyer: a }];
    } catch {
      return NextResponse.json({ error: "address is not a valid wallet address." }, { status: 400 });
    }
  }

  const txHash = p.get("txHash");
  if (txHash) filter.txHash = txHash;

  try {
    await connectMongo();
    const docs = await TransferModel.find(filter)
      .sort({ blockNumber: -1, logIndex: -1 })
      .limit(50)
      .lean();
    return NextResponse.json({ count: docs.length, transfers: docs.map(toTransfer) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}