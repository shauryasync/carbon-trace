import mongoose from "mongoose";
import { connectMongo } from "./mongo";
import { BatchModel, ZERO_ADDRESS, type BatchFields } from "./models/batch";
import { findOverlap } from "./overlap";

// SYNTHETIC DATA. These hashes are fake, so Etherscan will say "not found".
const fakeHash = (c: string) => "0x" + c.repeat(64);

const seeds: BatchFields[] = [
  {
    batchId: 9001,
    projectId: "SEED-KENYA-001",
    vintage: 2025,
    startSerial: 1000,
    endSerial: 2000,
    evidenceHash: fakeHash("a"),
    issuer: "0x1111111111111111111111111111111111111111",
    status: "issued",
    txHash: fakeHash("1"),
    auditor: "0x2222222222222222222222222222222222222222", // attested
  },
  {
    // Same serials as above but a DIFFERENT project: the contract allows this.
    batchId: 9002,
    projectId: "SEED-PERU-002",
    vintage: 2024,
    startSerial: 1500,
    endSerial: 1800,
    evidenceHash: fakeHash("b"),
    issuer: "0x3333333333333333333333333333333333333333",
    status: "retired",
    txHash: fakeHash("2"),
    auditor: "0x2222222222222222222222222222222222222222",
  },
  {
    batchId: 9003,
    projectId: "SEED-INDIA-003",
    vintage: 2024,
    startSerial: 3000,
    endSerial: 3019,
    evidenceHash: fakeHash("c"),
    issuer: "0x4444444444444444444444444444444444444444",
    status: "flagged",
    txHash: fakeHash("3"),
    auditor: ZERO_ADDRESS, // not yet attested
  },
];

// The double-count attack: re-register part of SEED-KENYA-001's range.
const attack = { projectId: "SEED-KENYA-001", startSerial: 1500, endSerial: 1800 };
// A legitimate next batch for the same project.
const clean = { projectId: "SEED-KENYA-001", startSerial: 2001, endSerial: 3000 };

async function main() {
  await connectMongo();

  // Re-runnable: remove only the seeded rows, then insert them again.
  await BatchModel.deleteMany({ batchId: { $in: seeds.map((s) => s.batchId) } });
  await BatchModel.insertMany(seeds);
  console.log(`Seeded ${seeds.length} batches.`);

  // Self-check using the same rule the API uses.
  const sameProject = await BatchModel.find({ projectId: attack.projectId }).lean();
  const blocked = findOverlap(attack, sameProject);
  const allowed = findOverlap(clean, sameProject);

  console.log(
    `Attack ${attack.startSerial}-${attack.endSerial}:`,
    blocked ? `BLOCKED (overlaps batch ${blocked.batchId})` : "NOT blocked (unexpected!)",
  );
  console.log(
    `Clean ${clean.startSerial}-${clean.endSerial}:`,
    allowed ? "blocked (unexpected!)" : "allowed",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());