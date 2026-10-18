import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { CompanyModel, toCompany } from "@/lib/models/company";
import { SESSION_COOKIE, readSessionToken } from "@/lib/session";

// GET -> the logged-in company, or 401
export async function GET(request: NextRequest) {
  try {
    // Read the cookie from the request itself, so this route is always dynamic.
    const address = readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
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