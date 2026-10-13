import { NextRequest, NextResponse } from "next/server";
import { mockCredits } from "@/lib/mockData";

export async function GET(request: NextRequest) {
  const query =
    request.nextUrl.searchParams.get("query")?.toLowerCase() ?? "";

  const credits = mockCredits.filter((credit) =>
    credit.projectId.toLowerCase().includes(query)
  );

  return NextResponse.json({
    mode: "development",
    count: credits.length,
    credits,
  });
}