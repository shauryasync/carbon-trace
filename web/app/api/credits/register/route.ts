import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { BatchModel, ZERO_ADDRESS, toCredit } from "@/lib/models/batch";
import { readBatchRegistration, ChainError } from "@/lib/chain";

const HASH = /^0x[a-fA-F0-9]{64}$/;

// POST { "txHash": "0x...", "vintage": 2025 }
// Reads the registration from Sepolia and saves what the CHAIN says.
// Anything else in the body (projectId, serials, issuer...) is ignored.
export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  const { txHash, vintage } = body ?? {};

  const problems: string[] = [];
  if (typeof txHash !== "string" || !HASH.test(txHash)) {
    problems.push("txHash must be 0x + 64 hex characters");
  }
  if (!Number.isSafeInteger(vintage)) {
    problems.push("vintage must be a whole number (not a string)");
  }
  if (problems.length > 0) {
    return NextResponse.json({ error: "Invalid registration fields.", problems }, { status: 400 });
  }

  try {
    const onChain = await readBatchRegistration(txHash); // validates on-chain first
    await connectMongo();

    const existing = await BatchModel.findOne({ batchId: onChain.batchId }).lean();

    await BatchModel.updateOne(
      { batchId: onChain.batchId },
      {
        // Chain facts always win, even over an older or fake record.
        $set: {
          projectId: onChain.projectId,
          vintage,
          startSerial: onChain.startSerial,
          endSerial: onChain.endSerial,
          evidenceHash: onChain.evidenceHash,
          issuer: onChain.issuer,
          txHash: onChain.txHash,
        },
        // Only set on first insert, so a repeat never resets these.
        $setOnInsert: { status: "issued", auditor: ZERO_ADDRESS },
      },
      { upsert: true },
    );

    const saved = await BatchModel.findOne({ batchId: onChain.batchId }).lean();
    return NextResponse.json(
      {
        source: "chain",
        replacedStaleRecord: !!existing && existing.txHash !== onChain.txHash,
        credit: toCredit(saved!),
      },
      { status: existing ? 200 : 201 },
    );
  } catch (e) {
    if (e instanceof ChainError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    // 11000 = duplicate key: two requests saved the same batch at the same moment.
    if ((e as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: "This batch is being saved. Try again." }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json(
      {
        error: "Database error.",
        // Only shown while developing.
        detail: process.env.NODE_ENV !== "production" ? String((e as Error)?.message) : undefined,
      },
      { status: 500 },
    );
  }
}