import { NextRequest, NextResponse } from "next/server";
import { getAddress } from "ethers";
import { randomBytes } from "crypto";
import { connectMongo } from "@/lib/mongo";
import { AuthChallengeModel } from "@/lib/models/authChallenge";

const CHALLENGE_MINUTES = 5;

// POST { "address": "0x..." } -> { message } for the wallet to sign
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
    address = getAddress(String(body?.address)); // validates and standardizes the casing
  } catch {
    return NextResponse.json({ error: "address is not a valid wallet address." }, { status: 400 });
  }

  const nonce = randomBytes(16).toString("hex");
  const message = [
    `${request.nextUrl.host} wants you to sign in with your wallet.`,
    "",
    `Wallet: ${address}`,
    `Nonce: ${nonce}`,
    `Issued: ${new Date().toISOString()}`,
    "",
    "This proves you control this wallet. It costs no gas and sends no transaction.",
  ].join("\n");

  try {
    await connectMongo();
    // Replaces any earlier unused challenge for this wallet.
    await AuthChallengeModel.findOneAndUpdate(
      { address },
      { address, nonce, message, expiresAt: new Date(Date.now() + CHALLENGE_MINUTES * 60 * 1000) },
      { upsert: true },
    );
    return NextResponse.json({ message });
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