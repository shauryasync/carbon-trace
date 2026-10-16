import { test } from "node:test";
import assert from "node:assert/strict";
import { findOverlap } from "./overlap";

const existing = [{ projectId: "KENYA-001", startSerial: 1000, endSerial: 2000 }];
const p = (projectId: string, startSerial: number, endSerial: number) => ({ projectId, startSerial, endSerial });

test("1500-1800 inside 1000-2000 overlaps", () => {
  assert.ok(findOverlap(p("KENYA-001", 1500, 1800), existing));
});

test("2001-3000 after 1000-2000 does not overlap", () => {
  assert.equal(findOverlap(p("KENYA-001", 2001, 3000), existing), null);
});

test("sharing one endpoint serial overlaps (inclusive)", () => {
  assert.ok(findOverlap(p("KENYA-001", 2000, 2500), existing));
});

test("same serials in a different project are allowed", () => {
  assert.equal(findOverlap(p("PERU-002", 1500, 1800), existing), null);
});

test("projectId is case-sensitive, like the contract", () => {
  assert.equal(findOverlap(p("kenya-001", 1500, 1800), existing), null);
});

test("bad range throws", () => {
  assert.throws(() => findOverlap(p("KENYA-001", 2000, 1000), existing));
});