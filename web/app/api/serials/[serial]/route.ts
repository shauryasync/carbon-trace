import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { BatchModel, toCredit } from "@/lib/models/batch";
import { TransferModel, toTransfer } from "@/lib/models/transfer";
import { readSerialOnChain } from "@/lib/chain";

type RouteContext = { params: Promise<{ serial: string }> };

// GET /api/serials/1200  (public, read-only, no login)
export async function GET(_request: Request, context: RouteContext) {
  const { serial: raw } = await context.params;
  const serial = Number(raw);
  if (!raw.trim() || !Number.isSafeInteger(serial) || serial < 0) {
    return NextResponse.json({ error: "serial must be a whole number." }, { status: 400 });
  }

  try {
    await connectMongo();

    // The same serial can exist in different projects, so this is a list.
    const batches = await BatchModel.find({
      startSerial: { $lte: serial },
      endSerial: { $gte: serial },
    })
      .sort({ batchId: 1 })
      .limit(20)
      .lean();

    if (batches.length === 0) {
      return NextResponse.json({
        serial,
        found: false,
        matches: [],
        message: "This serial is not in any batch the index knows about.",
      });
    }

    const ids = batches.map((b) => b.batchId).filter((x): x is number => typeof x === "number");
    const transfers = await TransferModel.find({
      batchId: { $in: ids },
      startSerial: { $lte: serial },
      endSerial: { $gte: serial },
    })
      .sort({ blockNumber: -1, logIndex: -1 }) // newest first
      .lean();

    const matches = await Promise.all(
      batches.map(async (b) => {
        const history = transfers.filter((t) => t.batchId === b.batchId);
        // Rule: latest transfer containing this serial wins; otherwise the issuer.
        const owner = history.length > 0 ? history[0].buyer : b.issuer;
        const ownerSource = history.length > 0 ? "transfer history" : "issuer (never sold)";

        let chain:
          | { checked: true; retired: boolean; auditor: string | null; ownerHoldsSerial: boolean }
          | { checked: false; error: string };
        if (typeof b.batchId !== "number") {
          chain = { checked: false, error: "This record has no on-chain batch id." };
        } else {
          try {
            chain = { checked: true, ...(await readSerialOnChain(b.batchId, serial, owner)) };
          } catch {
            chain = { checked: false, error: "Could not read this batch from the chain." };
          }
        }

        const base = toCredit(b);
        const status = chain.checked
          ? chain.retired
            ? "retired"
            : b.status === "flagged"
              ? "flagged"
              : "issued"
          : b.status;

        return {
          ...base,
          status,
          statusSource: chain.checked ? "chain" : "index (unverified)",
          auditor: chain.checked ? chain.auditor : null,
          owner,
          ownerSource,
          ownershipConfirmedOnChain: chain.checked ? chain.ownerHoldsSerial : null,
          warning:
            chain.checked && !chain.ownerHoldsSerial
              ? "The chain does not show this wallet holding the serial. A sale may not be synced yet."
              : undefined,
          chain,
          transfers: history.map(toTransfer),
        };
      }),
    );

    return NextResponse.json({ serial, found: true, matches });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error: "Database error.",
        detail: process.env.NODE_ENV !== "production" ? String((e as Error)?.message) : undefined,
      },
      { status: 500 },
    );
  }
}