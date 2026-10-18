import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { readTransfers, ChainError } from "@/lib/chain";
import { TransferModel, toTransfer } from "@/lib/models/transfer";

// POST { "txHash": "0x..." }
// Reads the purchase from Sepolia and saves what the CHAIN says.
export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const txHash = body?.txHash;
  if (typeof txHash !== "string") {
    return NextResponse.json({ error: "txHash must be a string." }, { status: 400 });
  }

  try {
    const transfers = await readTransfers(txHash); // validates on-chain first
    await connectMongo();

    // Upsert = insert if new, do nothing if it already exists. Safe to repeat.
    const result = await TransferModel.bulkWrite(
      transfers.map((t) => ({
        updateOne: {
          filter: { txHash: t.txHash, logIndex: t.logIndex },
          update: { $setOnInsert: t },
          upsert: true,
        },
      })),
    );

    const created = result.upsertedCount;
    return NextResponse.json(
      {
        synced: created,
        alreadySynced: transfers.length - created,
        transfers: transfers.map(toTransfer),
      },
      { status: created > 0 ? 201 : 200 },
    );
  } catch (e) {
    if (e instanceof ChainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json(
      {
        error: "Sync failed.",
        // Only shown while developing.
        detail: process.env.NODE_ENV !== "production" ? String((e as Error)?.message) : undefined,
      },
      { status: 500 },
    );
  }
}