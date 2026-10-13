import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    status: 200,
    ok: true,
    service: "Carbon Trace API",
    mode: "development",
    timestamp: new Date().toISOString(),
  });
}