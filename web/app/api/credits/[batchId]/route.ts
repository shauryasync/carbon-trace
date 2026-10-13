
import { NextResponse } from "next/server";
import { mockCredits } from "@/lib/mockData";

type RouteContext = {
  params: Promise<{ batchId: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  const { batchId } = await context.params;

  const credit = mockCredits.find(
    (item) => item.batchId === batchId,
  );

  if (!credit) {
    return NextResponse.json(
      {
        error: "Credit batch not found",
        batchId,
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    mode: "development",
    credit,
  });
}