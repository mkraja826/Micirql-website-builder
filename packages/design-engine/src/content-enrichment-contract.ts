import type { Site } from "@micirql/schema";
import { resolveIndustryIntelligence, type IndustryIntelligencePack } from "./industry-intelligence";

export type ContentSlotContract = {
  sectionId: string;
  family: string;
  editable: string[];
  itemCount?: number;
  role: string;
  avoidRepeating?: string[];
  guidance: string;
  objectives?: string[];
  trustSignals?: string[];
  ctaPatterns?: string[];
};

export type PageContentContract = {
  pageId: string;
  path: string;
  name: string;
  purpose: string;
  seo: { titleMax: number; descriptionMax: number };
  industry?: {
    id: string;
    label: string;
    priorities: string[];
    seoTopics: string[];
  };
  audience?: string[];
  targetLocations?: string[];
  sections: ContentSlotContract[];
};

/**
 * Produces a strict content-only contract for AI enrichment.
 * Component IDs, page paths, section ordering, palette, media geometry,
 * bindings and all design/runtime props are intentionally excluded.
 *
 * Industry intelligence is included as guidance only. It can shape copy,
 * priorities and CTA wording but can never authorize invented facts.
 */
export function buildContentEnrichmentContract(site: Site): PageContentContract[] {
  const industry = resolveSiteIndustry(site);
  return site.pages.map((page) => ({
    pageId: page.id,
    path: page.path,
    name: page.name,
    purpose: buildPagePurpose(site, page.name, page.seo?.description),
    seo: { titleMax: 60, descriptionMax: 155 },
    ...(industry ? {
      industry: {
        id: industry.id,
        label: industry.label,
        priorities: industry.priorities,
        seoTopics: industry.seoTopics,
      },
    } : {}),
    ...(site.seoBlueprint.audiences.length ? { audience: site.seoBlueprint.audiences } : {}),
    ...(site.seoBlueprint.targetLocations.length ? { targetLocations: site.seoBlueprint.targetLocations } : {}),
    sections: page.sections
      .filter((section) => !section.hidden)
      .map((section) => sectionContract(section.id, section.component.componentId, section.props, industry)),
  }));
}

function buildPagePurpose(site: Site, pageName: string, existing?: string) {
  const supplied = existing?.trim();
  if (supplied) return supplied;
  const goal = site.seoBlueprint.primaryGoal?.trim();
  const audience = site.seoBlueprint.audiences[0]?.trim();
  const location = site.seoBlueprint.targetLocations[0]?.trim();
  return [
    `Explain ${pageName} clearly`,
    audience ? `for ${audience}` : undefined,
    goal ? `and support the goal: ${goal}` : "and help the visitor take the next relevant step",
    location ? `with relevance to ${location}` : undefined,
  ].filter(Boolean).join(" ") + ".";
}

function sectionContract(sectionId: string, componentId: string, props: Record<string, unknown>, industry?: IndustryIntelligencePack): ContentSlotContract {
  const family = familyFromComponentId(componentId);
  const itemCount = Array.isArray(props.items) ? props.items.length : undefined;
  const common = { sectionId, family };
  const enrich = (baseGuidance: string, options?: { trust?: boolean; cta?: boolean }): Pick<ContentSlotContract, "guidance" | "objectives" | "trustSignals" | "ctaPatterns"> => {
    const prompts = industry?.contentPrompts[family] ?? [];
    const guidance = [baseGuidance, ...prompts].join(" ");
    return {
      guidance,
      ...(industry?.priorities.length ? { objectives: industry.priorities } : {}),
      ...(options?.trust && industry?.trustSignals.length ? { trustSignals: industry.trustSignals } : {}),
      ...(options?.cta && industry?.ctaPatterns.length ? { ctaPatterns: industry.ctaPatterns } : {}),
    };
  };

  if (family === "navbar") return {
    ...common,
    role: "Orient the visitor and expose the clearest next action without selling the business again.",
    avoidRepeating: ["hero value proposition", "about story", "service explanations"],
    editable: ["title", "primaryAction.label"],
    ...enrich("Keep navigation labels short. Do not add, remove, reorder or change links.", { cta: true }),
  };
  if (family === "hero") return {
    ...common,
    role: "State the single strongest page-level value proposition and establish immediate relevance.",
    avoidRepeating: ["detailed business history", "full service list", "process steps", "proof detail"],
    editable: ["eyebrow", "title", "heading", "description", "body", "primaryAction.label"],
    ...enrich("One clear value proposition. Headline <= 12 words; supporting copy <= 40 words. Do not change CTA href or image settings.", { trust: true, cta: true }),
  };
  if (family === "services") return {
    ...common,
    role: "Explain the visitor's real choices: what is offered, how options differ and what each is for.",
    avoidRepeating: ["hero promise", "about story", "team credentials", "process reassurance"],
    editable: ["eyebrow", "title", "heading", "description", "body", "items[].title", "items[].description"],
    ...(itemCount !== undefined ? { itemCount } : {}),
    ...enrich("Use only real supplied services or offerings. Keep each item concise; never invent prices, guarantees or capabilities."),
  };
  if (family === "features") return {
    ...common,
    role: "Provide concrete reasons to believe: verified technology, amenities, methods or differentiators.",
    avoidRepeating: ["service catalogue", "hero promise", "generic quality claims"],
    editable: ["eyebrow", "title", "heading", "description", "body", "items[].title", "items[].description"],
    ...(itemCount !== undefined ? { itemCount } : {}),
    ...enrich("Explain verified benefits, technology, amenities or differentiators appropriate to this page.", { trust: true }),
  };
  if (family === "about") return {
    ...common,
    role: "Establish factual context: who the business is, how it approaches the work and why that matters.",
    avoidRepeating: ["hero headline", "service list", "CTA language", "process steps"],
    editable: ["eyebrow", "title", "heading", "description", "body"],
    ...enrich("Write factual business story/positioning only from supplied information. Do not invent years, awards or credentials.", { trust: true }),
  };
  if (family === "process") return {
    ...common,
    role: "Reduce uncertainty by showing what the visitor can expect to happen next, in a simple sequence.",
    avoidRepeating: ["service descriptions", "hero promise", "team biography"],
    editable: ["eyebrow", "title", "heading", "description", "body", "items[].title", "items[].description"],
    ...(itemCount !== undefined ? { itemCount } : {}),
    ...enrich("Describe a simple visitor-facing process using only plausible steps supported by the brief; avoid operational claims not supplied."),
  };
  if (family === "testimonials") return {
    ...common,
    role: "Provide proof or clearly marked proof placeholders; do not introduce a new sales promise.",
    avoidRepeating: ["hero sales language", "service catalogue", "process explanation"],
    editable: ["eyebrow", "title", "heading", "description", "body"],
    ...enrich("Never fabricate testimonials, ratings, statistics or client names. Leave proof items as placeholders unless verified proof was supplied.", { trust: true }),
  };
  if (family === "gallery") return {
    ...common,
    role: "Let imagery demonstrate range, environment, work or outcomes with minimal explanatory text.",
    avoidRepeating: ["about story", "service descriptions", "hero promise"],
    editable: ["eyebrow", "title", "heading", "description", "body", "items[].title"],
    ...(itemCount !== undefined ? { itemCount } : {}),
    ...enrich("Write neutral labels for real-photo placeholders. Do not invent project results."),
  };
  if (family === "team") return {
    ...common,
    role: "Establish human trust and verified authority through real people and supplied credentials only.",
    avoidRepeating: ["business origin story", "hero promise", "service catalogue"],
    editable: ["eyebrow", "title", "heading", "description", "body"],
    ...enrich("Never invent people, names, roles, credentials or experience. Keep member slots as placeholders unless the brief supplied verified people data.", { trust: true }),
  };
  if (family === "cta") return {
    ...common,
    role: "Convert intent into one concrete next action; summarize as little as possible.",
    avoidRepeating: ["full hero proposition", "service list", "about narrative", "proof claims"],
    editable: ["eyebrow", "title", "heading", "description", "body", "primaryAction.label"],
    ...enrich("Use one direct low-friction next step. CTA label should usually be 2-4 words. Do not change its href/action.", { cta: true }),
  };
  if (family === "contact") return {
    ...common,
    role: "Make contacting or visiting the business feel practical, clear and low-friction.",
    avoidRepeating: ["hero promise", "about story", "service detail"],
    editable: ["eyebrow", "title", "heading", "description", "body", "primaryAction.label"],
    ...enrich("Keep contact copy practical and concise. Never invent phone, email, address or opening hours.", { trust: true, cta: true }),
  };
  if (family === "footer") return {
    ...common,
    role: "Close the page with orientation, concise brand context and navigation support only.",
    avoidRepeating: ["hero headline", "long about narrative", "service descriptions"],
    editable: ["title", "description", "body"],
    ...enrich("Keep footer copy brief. Do not change navigation links, legal links or shell structure."),
  };
  return {
    ...common,
    role: "Contribute one distinct factual idea that advances the page without restating neighboring sections.",
    avoidRepeating: ["hero promise", "neighboring section claims"],
    editable: ["title", "heading", "description", "body"],
    ...enrich("Write concise factual content only. Do not modify design or functional fields."),
  };
}

function resolveSiteIndustry(site: Site): IndustryIntelligencePack | undefined {
  return resolveIndustryIntelligence(site.subtype, `${site.domain} ${site.seoBlueprint.priorityTopics.join(" ")}`)
    ?? resolveIndustryIntelligence(site.domain, site.subtype);
}

function familyFromComponentId(componentId: string): string {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", services: "services", features: "features", process: "process", testimonials: "testimonials", gallery: "gallery", team: "team", cta: "cta", contact: "contact", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return "content";
}
