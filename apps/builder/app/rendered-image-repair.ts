import { siteSchema, type Site } from "@micirql/schema";
import type { RenderedImageQualityIssue } from "./rendered-image-quality";

export type RenderedImageRepairPlan = {
  required: boolean;
  operations: string[];
  reasons: string[];
  sectionIds: string[];
};

/**
 * One bounded image-quality repair pass. This may only correct presentation
 * metadata that is already supported by the Site contract. Broken/undersized
 * source assets and duplicate-media reselection remain hard failures unless a
 * qualified alternate asset is explicitly available in the section props.
 */
export function planRenderedImageRepair(input: {
  issues: RenderedImageQualityIssue[];
  attempt: number;
}): RenderedImageRepairPlan {
  if (input.attempt > 0 || input.issues.length === 0) return empty();
  const operations = new Set<string>();
  const sectionIds = new Set<string>();
  const reasons = new Set<string>();

  for (const issue of input.issues) {
    reasons.add(issue.code);
    if (issue.sectionId) sectionIds.add(issue.sectionId);
    if (issue.code === "IMAGE_CROP_TOO_AGGRESSIVE" && issue.sectionId) operations.add("relax-aggressive-crop");
    if (issue.code === "IMAGE_ALT_MISSING" && issue.sectionId) operations.add("restore-image-alt");
  }

  return {
    required: operations.size > 0,
    operations: [...operations],
    reasons: [...reasons],
    sectionIds: [...sectionIds],
  };
}

export function applyRenderedImageRepair(site: Site, plan: RenderedImageRepairPlan, path = "/"): Site {
  if (!plan.required) return site;
  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === path) ?? next.pages[0];
  if (!page) return site;

  for (const section of page.sections) {
    if (!plan.sectionIds.includes(section.id)) continue;
    const props = section.props as Record<string, unknown>;

    if (plan.operations.includes("relax-aggressive-crop")) {
      props.imageFit = "contain";
      props.imageFocalPoint = "center";
    }

    if (plan.operations.includes("restore-image-alt")) {
      const image = props.image;
      if (image && typeof image === "object" && !Array.isArray(image)) {
        const record = image as Record<string, unknown>;
        if (typeof record.alt !== "string" || !record.alt.trim()) {
          const label = firstText(props.title, props.heading, props.eyebrow, "Clinic image");
          record.alt = label;
        }
      }
    }

    props.renderedImageRepair = {
      version: 1,
      operations: [...plan.operations],
      reasons: [...plan.reasons],
    };
  }

  return siteSchema.parse(next);
}

function firstText(...values: unknown[]): string {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "Clinic image";
}

function empty(): RenderedImageRepairPlan {
  return { required: false, operations: [], reasons: [], sectionIds: [] };
}
