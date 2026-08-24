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

export function repairExplicitIdentity(profile: InterpretedOnboardingBrief, context: string): InterpretedOnboardingBrief {
  const explicitBusinessName = explicitBusinessNameFromBrief(context);
  const explicitLocation = explicitLocationFromBrief(context);
  const explicitAddresses = explicitAddressesFromBrief(context);

  const businessName = explicitBusinessName || profile.businessName;
  const location = explicitLocation || profile.location;
  const lockedFacts = {
    ...profile.lockedFacts,
    businessName: explicitBusinessName || profile.lockedFacts.businessName,
    location: explicitLocation || profile.lockedFacts.location,
    addresses: explicitAddresses,
  };

  let notes = profile.notes;
  if (explicitBusinessName) notes = replaceGroundingLine(notes, "Business name", explicitBusinessName);
  if (explicitLocation) notes = replaceGroundingLine(notes, "Location", explicitLocation);
  notes = replaceGroundingLine(notes, "Addresses", explicitAddresses.join(" | ") || "not supplied");

  return { ...profile, businessName, location, lockedFacts, notes };
}

export function explicitBusinessNameFromBrief(context: string): string {
  const websiteFor = context.match(/\b(?:website|site|webpage)\s+for\s+["']?([^,.!?\n]{2,80}?)["']?(?=,\s*(?:an?|the)\b|[.!?\n]|$)/i);
  const websiteForCandidate = cleanBusinessNameCandidate(websiteFor?.[1] ?? "");
  if (websiteForCandidate) return websiteForCandidate;

  const firstSentence = context.split(/[.!?\n]/)[0]?.trim() ?? "";
  if (!firstSentence) return "";
  const isMatch = firstSentence.match(/^(.{2,80}?)\s+is\s+(?:an?\s+)?(?:(?:premium|modern|private|family|specialist|boutique|high[- ]end|leading|independent|professional)\s+)*(?:dental\s+clinic|clinic|practice|company|business|restaurant|cafe|hotel|resort|agency|studio|school|academy|store|shop|platform|software\s+company)\b/i);
  return cleanBusinessNameCandidate(isMatch?.[1] ?? "");
}

function cleanBusinessNameCandidate(value: string): string {
  const candidate = value.trim().replace(/^["']|["']$/g, "").replace(/^(?:create|build|make|design)\s+(?:an?\s+)?(?:(?:premium|modern|professional|clean|responsive|high[- ]quality)\s*,?\s*)*(?:website|site|webpage)\s+for\s+/i, "").trim();
  if (!candidate || candidate.length > 80) return "";
  if (/^(?:i|we|this|our|my|the business|the company|the clinic)\b/i.test(candidate)) return "";
  if (/\b(?:website|site|webpage)\b/i.test(candidate)) return "";
  return candidate;
}

function explicitLocationFromBrief(context: string): string {
  const match = context.match(/\b(?:located\s+in|based\s+in)\s+([A-Z][A-Za-z .'-]{1,48}?)(?=\s+(?:focused|speciali[sz](?:ed|ing|es)?|offering|providing|with|that|where)\b|[,.;\n]|$)/);
  return match?.[1]?.trim() ?? "";
}

export function explicitAddressesFromBrief(context: string): string[] {
  const matches = [
    ...context.matchAll(/\b(?:clinic\s+address|office\s+address|business\s+address|address)\s*(?:is|:)?\s*([^\n.;]{8,140})/gi),
    ...context.matchAll(/\b(?:located\s+at|office\s+at|clinic\s+at)\s+([^\n.;]{8,140})/gi),
  ];
  const values = matches
    .map((match) => (match[1] ?? "").trim())
    .filter(Boolean)
    .filter((value) => !isNegatedFactContext(context, value));
  return [...new Set(values)].slice(0, 6);
}

function isNegatedFactContext(context: string, value: string): boolean {
  const index = context.toLowerCase().indexOf(value.toLowerCase());
  if (index < 0) return false;
  const prefix = context.slice(Math.max(0, index - 90), index).toLowerCase();
  return /(?:do\s+not|don't|never|without|not\s+supplied|not\s+provided|avoid\s+inventing|do\s+not\s+invent)[^.!?\n]{0,80}$/.test(prefix);
}

function replaceGroundingLine(notes: string, label: string, value: string): string {
  const pattern = new RegExp(`^${escapeRegExp(label)}:.*$`, "m");
  return pattern.test(notes) ? notes.replace(pattern, `${label}: ${value}`) : notes;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
