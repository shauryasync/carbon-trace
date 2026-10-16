import { Schema, model, models, type Model } from "mongoose";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Shared data format, exact field names.
export interface BatchFields {
  batchId?: number; // EXTRA: the on-chain batch id, so we can fetch by id
  projectId: string;
  vintage: number;
  startSerial: number;
  endSerial: number;
  evidenceHash: string;
  issuer: string;
  status: "issued" | "retired" | "flagged";
  txHash: string;
  auditor: string; // zero address until an approved auditor attests
}

const batchSchema = new Schema<BatchFields>(
  {
    batchId: { type: Number, unique: true, sparse: true },
    projectId: { type: String, required: true, index: true },
    vintage: { type: Number, required: true },
    startSerial: { type: Number, required: true },
    endSerial: { type: Number, required: true },
    evidenceHash: { type: String, required: true },
    issuer: { type: String, required: true },
    status: { type: String, enum: ["issued", "retired", "flagged"], default: "issued" },
    txHash: { type: String, required: true },
    auditor: { type: String, default: ZERO_ADDRESS },
  },
  { timestamps: true },
);

// Speeds up "which batch contains this serial?"
batchSchema.index({ startSerial: 1, endSerial: 1 });

// The `models.Batch ||` part avoids "model already exists" errors on hot reload.
export const BatchModel: Model<BatchFields> =
  (models.Batch as Model<BatchFields>) || model<BatchFields>("Batch", batchSchema);

// Strips Mongo internals (_id, __v, timestamps) so the API returns the shared format.
export function toCredit(d: BatchFields) {
  return {
    batchId: d.batchId,
    projectId: d.projectId,
    vintage: d.vintage,
    startSerial: d.startSerial,
    endSerial: d.endSerial,
    evidenceHash: d.evidenceHash,
    issuer: d.issuer,
    status: d.status,
    txHash: d.txHash,
    auditor: d.auditor,
  };
}