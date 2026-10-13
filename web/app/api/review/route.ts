
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, evidenceText } = body;

    if (
      typeof projectId !== "string" ||
      !projectId.trim() ||
      typeof evidenceText !== "string" ||
      !evidenceText.trim()
    ) {
      return NextResponse.json(
        { error: "projectId and evidenceText are required." },
        { status: 400 },
      );
    }

    if (evidenceText.length > 20000) {
      return NextResponse.json(
        { error: "Evidence text must be 20,000 characters or fewer." },
        { status: 413 },
      );
    }

    // Temporary rule-based checks. Gemini integration comes later.
    const text = evidenceText.toLowerCase();
    const flags: string[] = [];

    if (!/\b(methodology|method)\b/.test(text)) {
      flags.push("No methodology reference found.");
    }

    if (!/\b(monitoring|monitored|measurement)\b/.test(text)) {
      flags.push("No monitoring or measurement details found.");
    }

    if (!/\b(verification|verified|auditor|audit)\b/.test(text)) {
      flags.push("No independent verification or audit reference found.");
    }

    if (!/\b(19|20)\d{2}\b/.test(text)) {
      flags.push("No four-digit year found in the evidence text.");
    }

    return NextResponse.json({
      mode: "development",
      projectId: projectId.trim(),
      reviewStatus: flags.length > 0 ? "needs_review" : "no_flags_found",
      flags,
      requiresHumanReview: true,
      approvalGranted: false,
      disclaimer:
        "These are basic text checks, not an AI assessment or proof of carbon removal.",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }
}