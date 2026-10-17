import { Schema, model, models, type Model } from "mongoose";

// One row per CreditsTransferred event. Mirrors the chain; the chain is the truth.
export interface TransferFields {
  txHash: string;
  logIndex: number; // position of the event in the block
  listingId: number;
  batchId: number;
  seller: string;
  buyer: string;
  startSerial: number;
  endSerial: number;
  totalPriceWei: string; // string, because wei amounts can exceed JS number limits
  blockNumber: number;
  timestamp: number; // seconds since 1970, as the contract reports it
}

const transferSchema = new Schema<TransferFields>(
  {
    txHash: { type: String, required: true },
    logIndex: { type: Number, required: true },
    listingId: { type: Number, required: true },
    batchId: { type: Number, required: true },
    seller: { type: String, required: true },
    buyer: { type: String, required: true },
    startSerial: { type: Number, required: true },
    endSerial: { type: Number, required: true },
    totalPriceWei: { type: String, required: true },
    blockNumber: { type: Number, required: true },
    timestamp: { type: Number, required: true },
  },
  { timestamps: true },
);

// A transfer is uniquely identified by its transaction and its position in it.
// This is what makes syncing the same transaction twice harmless.
transferSchema.index({ txHash: 1, logIndex: 1 }, { unique: true });
// Speeds up "which transfers touched this serial?"
transferSchema.index({ batchId: 1, startSerial: 1, endSerial: 1 });
transferSchema.index({ seller: 1 });
transferSchema.index({ buyer: 1 });

export const TransferModel: Model<TransferFields> =
  (models.Transfer as Model<TransferFields>) || model<TransferFields>("Transfer", transferSchema);

// Strips Mongo internals so the API returns clean JSON.
export function toTransfer(d: TransferFields) {
  return {
    txHash: d.txHash,
    logIndex: d.logIndex,
    listingId: d.listingId,
    batchId: d.batchId,
    seller: d.seller,
    buyer: d.buyer,
    startSerial: d.startSerial,
    endSerial: d.endSerial,
    totalPriceWei: d.totalPriceWei,
    blockNumber: d.blockNumber,
    timestamp: d.timestamp,
  };
}