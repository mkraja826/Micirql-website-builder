import type { InterpretedBrief } from "../brief/schema";
import type { ContentClaim, ContentPlan } from "./schema";

function flattenClaims(plan: ContentPlan): ContentClaim[] {
  return [
    ...plan.pages.flatMap((page) => page.sections.flatMap((section) => section.claims ?? [])),
    ...(plan.faq ?? []).flatMap((item) => item.claims ?? []),
  ];
}

export function validateContentTruth(plan: ContentPlan, brief: InterpretedBrief): string[] {
  const errors: string[] = [];
  const knownFacts = brief.truth.knownFacts ?? {};

  for (const claim of flattenClaims(plan)) {
    if (claim.grounding !== "known_fact") continue;

    if (!claim.factKey || !(claim.factKey in knownFacts)) {
      errors.push(`Unsupported known-fact claim: ${claim.text}`);
      continue;
    }

    const value = knownFacts[claim.factKey];
    if (value == null || !claim.text.toLowerCase().includes(String(value).toLowerCase())) {
      errors.push(`Known-fact claim does not contain its grounded value: ${claim.factKey}`);
    }
  }

  const serialized = JSON.stringify(plan).toLowerCase();
  for (const prohibited of brief.truth.prohibitedClaims) {
    if (serialized.includes(prohibited.toLowerCase())) {
      errors.push(`Content plan repeats prohibited claim category: ${prohibited}`);
    }
  }

  return [...new Set(errors)];
}
