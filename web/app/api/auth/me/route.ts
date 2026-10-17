import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { CompanyModel, toCompany } from "@/lib/models/company";
import { getSessionAddress } from "@/lib/session";

// GET -> the logged-in company, or 401
export async function GET() {
  try {
    const address = await getSessionAddress();
    if (!address) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

    await connectMongo();
    const company = await CompanyModel.findOne({ address }).lean();
    if (!company) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

    return NextResponse.json({ company: toCompany(company) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not check login." }, { status: 500 });
  }
}