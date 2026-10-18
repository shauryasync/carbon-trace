import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "ethers";
import { connectMongo } from "@/lib/mongo";
import { CompanyModel } from "@/lib/models/company";

const MAX_ADDRESSES = 20;

// GET /api/companies?addresses=0xabc...,0xdef...   (public, read-only)
// Returns { companies: { "<address as you sent it>": "Company name" } }.
// Addresses with no registered company are simply left out.
export async function GET(request: NextRequest) {
  const raw = (request.nextUrl.searchParams.get("addresses") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (raw.length === 0 || raw.length > MAX_ADDRESSES) {
    return NextResponse.json(
      { error: `Provide 1 to ${MAX_ADDRESSES} comma-separated addresses.` },
      { status: 400 },
    );
  }

  // input as sent -> standard checksummed form
  const normalized = new Map<string, string>();
  for (const r of raw) {
    try {
      normalized.set(r, getAddress(r));
    } catch {
      return NextResponse.json({ error: `Not a valid address: ${r}` }, { status: 400 });
    }
  }

  try {
    await connectMongo();
    const docs = await CompanyModel.find({ address: { $in: [...new Set(normalized.values())] } }).lean();
    const nameByAddress = new Map(docs.map((d) => [d.address, d.name]));

    const companies: Record<string, string> = {};
    for (const [input, checksummed] of normalized) {
      const name = nameByAddress.get(checksummed);
      if (name) companies[input] = name;
    }
    // selfDeclared is a reminder for the UI: these names are NOT verified.
    return NextResponse.json({ companies, selfDeclared: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }
}