import { NextRequest, NextResponse } from "next/server";
import { interpretOnboardingBrief } from "../../../onboarding-brief-intelligence";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    const body = await request.json() as { context?: unknown };
    const context = typeof body.context === "string" ? body.context.trim() : "";
    if (context.length < 20) return NextResponse.json({ error: "Describe your business and website needs in a little more detail." }, { status: 400 });
    const profile = await interpretOnboardingBrief(context);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not understand the website brief." }, { status: 500 });
  }
}
