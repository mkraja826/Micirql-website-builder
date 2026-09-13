import type { CandidateCapabilityPlan } from "../capabilities/planner";
import type { ContentPlan } from "../content/schema";
import type { SiteCandidatePlan } from "../generation/candidates";
import type { DraftCapabilityState, PublishableDraft } from "./schema";

function capabilityState(status: "available" | "preview" | "needs_configuration"): DraftCapabilityState {
  if (status === "available") return "active";
  if (status === "needs_configuration") return "disabled_needs_configuration";
  return "disabled_preview";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function composePublishableDraft({
  candidate,
  content,
  capabilityPlan,
}: {
  candidate: SiteCandidatePlan;
  content: ContentPlan;
  capabilityPlan: CandidateCapabilityPlan;
}): PublishableDraft {
  const blockers: string[] = [];
  const warnings = [...content.warnings];

  if (!content.pages.length) blockers.push("Content plan has no pages.");
  if (!candidate.sectionOrder.length) blockers.push("Candidate has no section order.");

  const pages = content.pages.map((page, pageIndex) => {
    const contentSectionTypes = page.sections.map((section) => section.sectionType);
    const sectionOrder = pageIndex === 0
      ? candidate.sectionOrder.filter((sectionType) => sectionType === "navbar" || sectionType === "footer" || contentSectionTypes.includes(sectionType))
      : contentSectionTypes;

    if (!page.slug.trim()) blockers.push(`Page ${pageIndex + 1} is missing a slug.`);
    if (!page.title.trim()) blockers.push(`Page ${page.slug || pageIndex + 1} is missing a title.`);
    if (!page.sections.length) blockers.push(`Page ${page.slug || pageIndex + 1} has no content sections.`);

    const missingContent = sectionOrder.filter((sectionType) => !["navbar", "footer"].includes(sectionType) && !contentSectionTypes.includes(sectionType));
    if (missingContent.length) blockers.push(`Page ${page.slug || pageIndex + 1} is missing content for: ${missingContent.join(", ")}.`);

    return {
      slug: page.slug,
      title: page.title,
      sectionOrder,
      contentSectionTypes,
    };
  });

  const capabilities = capabilityPlan.capabilities.map((planned) => ({
    id: planned.id,
    label: planned.label,
    state: capabilityState(planned.status),
    href: planned.status === "available" ? planned.href : undefined,
    reason: planned.reason,
  }));

  const disabledCapabilities = capabilities.filter((item) => item.state !== "active");
  if (disabledCapabilities.length) {
    warnings.push(`Disabled until configured or verified: ${disabledCapabilities.map((item) => item.id).join(", ")}.`);
  }

  return {
    version: "1.0",
    candidateId: candidate.id,
    readiness: blockers.length ? "blocked" : "ready",
    pages,
    selectedSections: { ...candidate.selectedSections },
    theme: candidate.theme,
    cssVariables: { ...candidate.cssVariables },
    primaryCapability: capabilityPlan.primary,
    capabilities,
    blockers: unique(blockers),
    warnings: unique(warnings),
    source: {
      contentVersion: content.version,
    },
  };
}
