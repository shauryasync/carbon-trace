import { NextRequest, NextResponse } from "next/server";
import { getAddress, verifyMessage } from "ethers";
import { connectMongo } from "@/lib/mongo";
import { AuthChallengeModel } from "@/lib/models/authChallenge";
import { CompanyModel, toCompany } from "@/lib/models/company";
import { setSessionCookie } from "@/lib/session";

// POST { address, signature, companyName? }
// companyName is only needed the FIRST time a wallet logs in.
export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  let address: string;
  try {
    address = getAddress(String(body?.address));
  } catch {
    return NextResponse.json({ error: "address is not a valid wallet address." }, { status: 400 });
  }
  const signature = body?.signature;
  if (typeof signature !== "string" || !signature) {
    return NextResponse.json({ error: "signature must be a string." }, { status: 400 });
  }

  try {
    await connectMongo();

    const challenge = await AuthChallengeModel.findOne({ address });
    if (!challenge || challenge.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: "No active login request for this wallet. Request a new one." },
        { status: 400 },
      );
    }

    // Recover who signed the EXACT message we stored (not one the browser sent).
    let signer: string;
    try {
      signer = verifyMessage(challenge.message, signature);
    } catch {
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
    if (signer !== address) {
      return NextResponse.json({ error: "Signature does not match this wallet." }, { status: 401 });
    }

    // First login needs a company name. We check BEFORE using up the challenge,
    // so the user can resend the same signature with a name.
    let company = await CompanyModel.findOne({ address });
    const name = typeof body?.companyName === "string" ? body.companyName.trim() : "";
    if (!company && (name.length < 2 || name.length > 80)) {
      return NextResponse.json(
        { error: "First login: provide a company name (2-80 characters).", needsCompanyName: true },
        { status: 400 },
      );
    }

    // One-time use: whoever deletes the challenge first wins. Replays fail here.
    const used = await AuthChallengeModel.deleteOne({ _id: challenge._id });
    if (used.deletedCount !== 1) {
      return NextResponse.json({ error: "This login request was already used." }, { status: 409 });
    }

    if (!company) {
      try {
        company = await CompanyModel.create({ address, name });
      } catch (e) {
        // 11000 = duplicate key: another request created it a moment ago.
        if ((e as { code?: number })?.code !== 11000) throw e;
        company = await CompanyModel.findOne({ address });
      }
    }

    const res = NextResponse.json({ company: toCompany(company!) });
    setSessionCookie(res, address);
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error: "Login failed.",
        detail: process.env.NODE_ENV !== "production" ? String((e as Error)?.message) : undefined,
      },
      { status: 500 },
    );
  }
}