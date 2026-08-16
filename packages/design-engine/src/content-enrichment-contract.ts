import type { Site } from "@micirql/schema";

export type ContentSlotContract = {
  sectionId: string;
  family: string;
  editable: string[];
  itemCount?: number;
  guidance: string;
};

export type PageContentContract = {
  pageId: string;
  path: string;
  name: string;
  purpose: string;
  seo: { titleMax: number; descriptionMax: number };
  sections: ContentSlotContract[];
};

/**
 * Produces a strict content-only contract for AI enrichment.
 * Component IDs, page paths, section ordering, palette, media geometry,
 * bindings and all design/runtime props are intentionally excluded.
 */
export function buildContentEnrichmentContract(site: Site): PageContentContract[] {
  return site.pages.map((page) => ({
    pageId: page.id,
    path: page.path,
    name: page.name,
    purpose: page.seo?.description?.trim() || `Explain ${page.name} clearly and help the visitor take the next relevant step.`,
    seo: { titleMax: 60, descriptionMax: 155 },
    sections: page.sections
      .filter((section) => !section.hidden)
      .map((section) => sectionContract(section.id, section.component.componentId, section.props)),
  }));
}

function sectionContract(sectionId: string, componentId: string, props: Record<string, unknown>): ContentSlotContract {
  const family = familyFromComponentId(componentId);
  const itemCount = Array.isArray(props.items) ? props.items.length : undefined;
  const common = { sectionId, family };

  if (family === "navbar") return { ...common, editable: ["title", "primaryAction.label"], guidance: "Keep navigation labels short. Do not add, remove, reorder or change links." };
  if (family === "hero") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body", "primaryAction.label"], guidance: "One clear value proposition. Headline <= 12 words; supporting copy <= 40 words. Do not change CTA href or image settings." };
  if (family === "services") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body", "items[].title", "items[].description"], ...(itemCount !== undefined ? { itemCount } : {}), guidance: "Use only real supplied services or offerings. Keep each item concise; never invent prices, guarantees or capabilities." };
  if (family === "features") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body", "items[].title", "items[].description"], ...(itemCount !== undefined ? { itemCount } : {}), guidance: "Explain verified benefits, technology, amenities or differentiators appropriate to this page." };
  if (family === "about") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body"], guidance: "Write factual business story/positioning only from supplied information. Do not invent years, awards or credentials." };
  if (family === "process") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body", "items[].title", "items[].description"], ...(itemCount !== undefined ? { itemCount } : {}), guidance: "Describe a simple visitor-facing process using only plausible steps supported by the brief; avoid operational claims not supplied." };
  if (family === "testimonials") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body"], guidance: "Never fabricate testimonials, ratings, statistics or client names. Leave proof items as placeholders unless verified proof was supplied." };
  if (family === "gallery") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body", "items[].title"], ...(itemCount !== undefined ? { itemCount } : {}), guidance: "Write neutral labels for real-photo placeholders. Do not invent project results." };
  if (family === "team") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body"], guidance: "Never invent people, names, roles, credentials or experience. Keep member slots as placeholders unless the brief supplied verified people data." };
  if (family === "cta") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body", "primaryAction.label"], guidance: "Use one direct low-friction next step. CTA label should usually be 2-4 words. Do not change its href/action." };
  if (family === "contact") return { ...common, editable: ["eyebrow", "title", "heading", "description", "body", "primaryAction.label"], guidance: "Keep contact copy practical and concise. Never invent phone, email, address or opening hours." };
  if (family === "footer") return { ...common, editable: ["title", "description", "body"], guidance: "Keep footer copy brief. Do not change navigation links, legal links or shell structure." };
  return { ...common, editable: ["title", "heading", "description", "body"], guidance: "Write concise factual content only. Do not modify design or functional fields." };
}

function familyFromComponentId(componentId: string): string {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", services: "services", features: "features", process: "process", testimonials: "testimonials", gallery: "gallery", team: "team", cta: "cta", contact: "contact", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return "content";
}
