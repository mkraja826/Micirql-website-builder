import { siteSchema, type Site } from "@micirql/schema";
import type { RenderedImageQualityIssue } from "./rendered-image-quality";

export type RenderedImageRepairPlan = {
  required: boolean;
  operations: string[];
  reasons: string[];
  sectionIds: string[];
  reselectSectionIds: string[];
};

/** One bounded image-quality repair pass. */
export function planRenderedImageRepair(input: {
  issues: RenderedImageQualityIssue[];
  attempt: number;
  site?: Site;
  path?: string;
}): RenderedImageRepairPlan {
  if (input.attempt > 0 || input.issues.length === 0) return empty();
  const operations = new Set<string>();
  const sectionIds = new Set<string>();
  const reselectSectionIds = new Set<string>();
  const reasons = new Set<string>();

  for (const issue of input.issues) {
    reasons.add(issue.code);
    if (issue.sectionId) sectionIds.add(issue.sectionId);
    if (issue.code === "IMAGE_CROP_TOO_AGGRESSIVE" && issue.sectionId) operations.add("relax-aggressive-crop");
    if (issue.code === "IMAGE_ALT_MISSING" && issue.sectionId) operations.add("restore-image-alt");
    if ((issue.code === "IMAGE_FAILED_TO_LOAD" || issue.code === "IMAGE_UPSCALED_TOO_FAR" || issue.code === "IMAGE_REUSED_TOO_OFTEN") && issue.sectionId && input.site && hasQualifiedAlternate(input.site, issue.sectionId, input.path ?? "/")) {
      operations.add("reselect-qualified-alternate");
      reselectSectionIds.add(issue.sectionId);
    }
  }

  return {
    required: operations.size > 0,
    operations: [...operations],
    reasons: [...reasons],
    sectionIds: [...sectionIds],
    reselectSectionIds: [...reselectSectionIds],
  };
}

export function applyRenderedImageRepair(site: Site, plan: RenderedImageRepairPlan, path = "/"): Site {
  if (!plan.required) return site;
  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.path === path) ?? next.pages[0];
  if (!page) return site;
  const usedUrls = collectUsedImageUrls(page.sections.map((section) => section.props as Record<string, unknown>));

  for (const section of page.sections) {
    if (!plan.sectionIds.includes(section.id)) continue;
    const props = section.props as Record<string, unknown>;
    let reselection: Record<string, unknown> | undefined;

    if (plan.operations.includes("reselect-qualified-alternate") && plan.reselectSectionIds.includes(section.id)) {
      const currentUrl = imageUrl(props.image);
      if (currentUrl) usedUrls.delete(currentUrl);
      const alternate = bestQualifiedAlternate(props.qualifiedMediaAlternates, usedUrls);
      if (alternate) {
        const alt = stringValue(alternate.alt) ?? firstText(props.title, props.heading, props.eyebrow, "Clinic image");
        props.image = { src: alternate.url, alt };
        if (typeof alternate.aspect === "string") props.imageRatio = normalizeRatio(alternate.aspect) ?? props.imageRatio;
        props.imageFit = "cover";
        props.imageFocalPoint = Array.isArray(alternate.tags) && alternate.tags.some((tag) => typeof tag === "string" && /person|people|team|portrait|face/i.test(tag)) ? "face-safe" : "center";
        usedUrls.add(alternate.url as string);
        reselection = { id: alternate.id, url: alternate.url, score: alternate.score, reason: alternate.reason };
      }
    }

    if (plan.operations.includes("relax-aggressive-crop") && !reselection) {
      props.imageFit = "contain";
      props.imageFocalPoint = "center";
    }

    if (plan.operations.includes("restore-image-alt")) {
      const image = props.image;
      if (image && typeof image === "object" && !Array.isArray(image)) {
        const record = image as Record<string, unknown>;
        if (typeof record.alt !== "string" || !record.alt.trim()) record.alt = firstText(props.title, props.heading, props.eyebrow, "Clinic image");
      }
    }

    props.renderedImageRepair = {
      version: 2,
      operations: [...plan.operations],
      reasons: [...plan.reasons],
      ...(reselection ? { reselection } : {}),
    };
  }

  return siteSchema.parse(next);
}

function hasQualifiedAlternate(site: Site, sectionId: string, path: string): boolean {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  const section = page?.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return false;
  return qualifiedAlternates((section.props as Record<string, unknown>).qualifiedMediaAlternates).length > 0;
}

function bestQualifiedAlternate(value: unknown, usedUrls: Set<string>): Record<string, unknown> | undefined {
  return qualifiedAlternates(value)
    .filter((entry) => typeof entry.url === "string" && !usedUrls.has(entry.url))
    .filter((entry) => {
      const width = numberValue(entry.width), height = numberValue(entry.height);
      return !(width && height) || Math.max(width, height) >= 900;
    })
    .sort((a, b) => numberValue(b.score) - numberValue(a.score))[0];
}

function qualifiedAlternates(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object" && !Array.isArray(entry) && typeof (entry as Record<string, unknown>).url === "string"));
}

function collectUsedImageUrls(propsList: Record<string, unknown>[]): Set<string> {
  const urls = new Set<string>();
  for (const props of propsList) {
    const url = imageUrl(props.image);
    if (url) urls.add(url);
    const items = Array.isArray(props.items) ? props.items : [];
    for (const item of items) if (item && typeof item === "object" && !Array.isArray(item)) {
      const image = (item as Record<string, unknown>).image;
      if (typeof image === "string" && image) urls.add(image);
      else { const nested = imageUrl(image); if (nested) urls.add(nested); }
    }
  }
  return urls;
}

function imageUrl(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  return typeof record.src === "string" && record.src ? record.src : undefined;
}

function normalizeRatio(value:string){if(value==="1:1"||value==="4:3"||value==="3:2"||value==="16:9")return value;return value==="wide"?"21:9":value==="portrait"?"4:5":undefined;}
function numberValue(value: unknown): number { return typeof value === "number" && Number.isFinite(value) ? value : 0; }
function stringValue(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
function firstText(...values: unknown[]): string {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "Clinic image";
}
function empty(): RenderedImageRepairPlan {
  return { required: false, operations: [], reasons: [], sectionIds: [], reselectSectionIds: [] };
}
