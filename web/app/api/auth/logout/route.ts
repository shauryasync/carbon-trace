import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

// POST -> clears the login cookie
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}