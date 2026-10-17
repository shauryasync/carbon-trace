import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "ct_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET is missing or too short (32+ characters). Add it to web/.env.local");
  }
  return s;
}

const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");

// The token is "<payload>.<signature>". Changing the payload breaks the signature.
export function createSessionToken(address: string) {
  const payload = Buffer.from(
    JSON.stringify({ a: address, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

// Returns the wallet address inside a valid, unexpired token, otherwise null.
export function readSessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const given = Buffer.from(sig);
  const expected = Buffer.from(sign(payload));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  try {
    const { a, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof a !== "string" || typeof exp !== "number" || exp < Date.now() / 1000) return null;
    return a;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setSessionCookie(res: NextResponse, address: string) {
  res.cookies.set(SESSION_COOKIE, createSessionToken(address), { ...cookieOptions, maxAge: MAX_AGE_SECONDS });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
}

// For API routes: the logged-in wallet address, or null.
export async function getSessionAddress() {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}