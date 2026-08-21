import { NextRequest, NextResponse } from "next/server";
import { recommendWebsiteLayouts } from "@micirql/design-engine";
import { interpretOnboardingBrief, type InterpretedOnboardingBrief } from "../../../onboarding-brief-intelligence";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    const body = await request.json() as { context?: unknown };
    const context = typeof body.context === "string" ? body.context.trim() : "";
    if (context.length < 20) return NextResponse.json({ error: "Describe your business and website needs in a little more detail." }, { status: 400 });
    const profile = repairExplicitIdentity(await interpretOnboardingBrief(context), context);
    const layoutRecommendations = recommendWebsiteLayouts({
      industry: profile.industry,
      ...(profile.subindustry ? { subindustryId: profile.subindustry } : {}),
      goals: profile.goals,
      priorities: profile.requiredCapabilities,
      styleTags: profile.styleTags,
      context,
    }, 2).map((item) => ({
      id: item.layout.id,
      name: item.layout.name,
      description: item.layout.description,
      score: item.score,
      reasons: item.reasons,
      archetype: item.layout.archetype,
      styleTags: item.layout.styleTags,
      preferredSubindustry: item.layout.fit.subindustryIds.length === 1 ? item.layout.fit.subindustryIds[0] : null,
    }));
    return NextResponse.json({ ok: true, profile, layoutRecommendation: layoutRecommendations[0] ?? null, layoutAlternative: layoutRecommendations[1] ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not understand the website brief." }, { status: 500 });
  }
}

function repairExplicitIdentity(profile: InterpretedOnboardingBrief, context: string): InterpretedOnboardingBrief {
  const explicitBusinessName = explicitBusinessNameFromBrief(context);
  const explicitLocation = explicitLocationFromBrief(context);
  if (!explicitBusinessName && !explicitLocation) return profile;

  const businessName = explicitBusinessName || profile.businessName;
  const location = explicitLocation || profile.location;
  const lockedFacts = {
    ...profile.lockedFacts,
    businessName: explicitBusinessName || profile.lockedFacts.businessName,
    location: explicitLocation || profile.lockedFacts.location,
  };

  let notes = profile.notes;
  if (explicitBusinessName) notes = replaceGroundingLine(notes, "Business name", explicitBusinessName);
  if (explicitLocation) notes = replaceGroundingLine(notes, "Location", explicitLocation);

  return { ...profile, businessName, location, lockedFacts, notes };
}

function explicitBusinessNameFromBrief(context: string): string {
  const firstSentence = context.split(/[.!?\n]/)[0]?.trim() ?? "";
  if (!firstSentence) return "";
  const match = firstSentence.match(/^(.{2,80}?)\s+is\s+(?:an?\s+)?(?:(?:premium|modern|private|family|specialist|boutique|high[- ]end|leading|independent)\s+)*(?:dental\s+clinic|clinic|practice|company|business|restaurant|cafe|hotel|resort|agency|studio|school|academy|store|shop|platform|software\s+company)\b/i);
  const candidate = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!candidate || /^(?:i|we|this|our)\b/i.test(candidate)) return "";
  return candidate;
}

function explicitLocationFromBrief(context: string): string {
  const match = context.match(/\b(?:located\s+in|based\s+in|in)\s+([A-Z][A-Za-z .'-]{1,48}?)(?=\s+(?:focused|speciali[sz](?:ed|ing|es)?|offering|providing|with|that|where)\b|[,.;\n]|$)/);
  return match?.[1]?.trim() ?? "";
}

function replaceGroundingLine(notes: string, label: string, value: string): string {
  const pattern = new RegExp(`^${escapeRegExp(label)}:.*$`, "m");
  return pattern.test(notes) ? notes.replace(pattern, `${label}: ${value}`) : notes;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
