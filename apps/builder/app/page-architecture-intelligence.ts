import type { DesignRegistryEntry } from "@micirql/registry";
import { siteSchema, type Site } from "@micirql/schema";
import {
  FAMILY_CODES,
  sectionDesignId,
  seedSectionRegistryEntries,
  type SectionFamily as LibrarySectionFamily,
  type SectionVariant,
} from "@micirql/sections";

export type PageArchitectureInput = {
  industry: string;
  subindustry?: string | null;
  services: string[];
  goals: string[];
  requiredCapabilities: string[];
  notes?: string | null;
  businessName: string;
  location?: string | null;
};

type PageRole = "home" | "about" | "services" | "service-detail" | "team" | "gallery" | "blog" | "faq" | "contact";
type SectionFamily = "navbar" | "hero" | "about" | "services" | "features" | "process" | "testimonials" | "gallery" | "team" | "cta" | "contact" | "footer";
type PlacementRole = NonNullable<DesignRegistryEntry["intelligence"]>["placementRoles"][number];
type Density = NonNullable<DesignRegistryEntry["intelligence"]>["contentDensity"];
type VisualWeight = NonNullable<DesignRegistryEntry["intelligence"]>["visualWeight"];

type ArchitecturePage = {
  id: string;
  path: string;
  name: string;
  primaryKeyword?: string;
  purpose: string;
  role: PageRole;
};

export type PageArchitecturePlan = {
  pages: ArchitecturePage[];
  reasons: string[];
};

type SectionIntent = {
  conversionGoals: string[];
  placementRole: PlacementRole;
  preferImage?: boolean | undefined;
  targetContentDensity?: Density | undefined;
  targetVisualWeight?: VisualWeight | undefined;
};

const PAGE_RECIPES: Record<Exclude<PageRole, "home">, SectionFamily[]> = {
  about: ["navbar", "hero", "about", "features", "team", "testimonials", "cta", "footer"],
  services: ["navbar", "hero", "services", "features", "process", "testimonials", "cta", "footer"],
  "service-detail": ["navbar", "hero", "about", "features", "process", "testimonials", "cta", "contact", "footer"],
  team: ["navbar", "hero", "team", "about", "testimonials", "cta", "footer"],
  gallery: ["navbar", "hero", "gallery", "testimonials", "about", "cta", "footer"],
  blog: ["navbar", "hero", "features", "services", "process", "cta", "footer"],
  faq: ["navbar", "hero", "features", "process", "cta", "contact", "footer"],
  contact: ["navbar", "hero", "contact", "cta", "footer"],
};

const ROLE_INTENTS: Record<Exclude<PageRole, "home">, Partial<Record<SectionFamily, SectionIntent>>> = {
  about: {
    hero: intent(["trust", "authority"], "opening", true, "low", "medium"),
    about: intent(["trust", "authority", "education"], "core-content", true, "high", "medium"),
    features: intent(["trust", "differentiation"], "early-proof", false, "medium", "light"),
    team: intent(["trust", "authority"], "core-content", true, "medium", "medium"),
    testimonials: intent(["trust"], "decision-support", true, "medium", "medium"),
    cta: intent(["lead-generation", "appointments", "sales"], "conversion", false, "low", "medium"),
  },
  services: {
    hero: intent(["sales", "appointments", "education"], "opening", true, "low", "medium"),
    services: intent(["sales", "appointments", "discovery"], "core-content", true, "high", "medium"),
    features: intent(["differentiation", "education"], "decision-support", false, "medium", "light"),
    process: intent(["education", "trust"], "decision-support", false, "medium", "medium"),
    testimonials: intent(["trust", "sales"], "decision-support", true, "medium", "medium"),
    cta: intent(["lead-generation", "appointments", "sales"], "conversion", false, "low", "medium"),
  },
  "service-detail": {
    hero: intent(["sales", "appointments", "education"], "opening", true, "low", "heavy"),
    about: intent(["education", "trust"], "core-content", true, "medium", "medium"),
    features: intent(["differentiation", "education"], "decision-support", false, "medium", "medium"),
    process: intent(["education", "trust", "appointments"], "decision-support", false, "medium", "medium"),
    testimonials: intent(["trust", "appointments"], "decision-support", true, "medium", "medium"),
    cta: intent(["lead-generation", "appointments", "sales"], "conversion", true, "low", "heavy"),
    contact: intent(["lead-generation", "appointments", "enquiries"], "closing", false, "medium", "light"),
  },
  team: {
    hero: intent(["trust", "authority"], "opening", true, "low", "medium"),
    team: intent(["trust", "authority", "appointments"], "core-content", true, "high", "medium"),
    about: intent(["trust", "education"], "core-content", true, "medium", "light"),
    testimonials: intent(["trust"], "decision-support", true, "medium", "medium"),
    cta: intent(["lead-generation", "appointments"], "conversion", false, "low", "medium"),
  },
  gallery: {
    hero: intent(["trust", "visual-proof"], "opening", true, "low", "medium"),
    gallery: intent(["portfolio", "visual-proof", "trust"], "visual-break", true, "low", "heavy"),
    testimonials: intent(["trust", "sales"], "decision-support", true, "medium", "medium"),
    about: intent(["trust", "education"], "core-content", true, "medium", "light"),
    cta: intent(["lead-generation", "appointments", "sales"], "conversion", false, "low", "medium"),
  },
  blog: {
    hero: intent(["awareness", "education"], "opening", true, "low", "light"),
    features: intent(["education", "discovery"], "core-content", false, "high", "light"),
    services: intent(["discovery", "education"], "core-content", true, "medium", "medium"),
    process: intent(["education"], "decision-support", false, "medium", "light"),
    cta: intent(["lead-generation", "signup"], "conversion", false, "low", "light"),
  },
  faq: {
    hero: intent(["trust", "education"], "opening", false, "low", "light"),
    features: intent(["education", "trust"], "core-content", false, "high", "light"),
    process: intent(["education", "trust"], "decision-support", false, "medium", "light"),
    cta: intent(["lead-generation", "appointments"], "conversion", false, "low", "medium"),
    contact: intent(["lead-generation", "appointments", "enquiries"], "closing", false, "medium", "light"),
  },
  contact: {
    hero: intent(["lead-generation", "appointments", "enquiries"], "opening", true, "low", "medium"),
    contact: intent(["lead-generation", "appointments", "enquiries"], "conversion", false, "medium", "light"),
    cta: intent(["lead-generation", "appointments", "sales"], "closing", false, "low", "medium"),
  },
};

export function planPageArchitecture(input: PageArchitectureInput): PageArchitecturePlan {
  const industry = input.industry.toLowerCase();
  const notes = (input.notes ?? "").toLowerCase();
  const capabilities = new Set(input.requiredCapabilities.map((item) => item.toLowerCase()));
  const goals = new Set(input.goals.map((item) => item.toLowerCase()));
  const services = unique(input.services.map(cleanService).filter(Boolean)).slice(0, 8);
  const healthcare = /dental|clinic|medical|health/.test(industry);
  const pages: ArchitecturePage[] = [
    { id: "home", path: "/", name: "Home", purpose: "Primary conversion and trust page", role: "home" },
    { id: "about", path: "/about", name: "About", purpose: "Business story, credibility and differentiation", role: "about" },
  ];

  if (services.length) {
    pages.push({ id: "services", path: "/services", name: healthcare ? "Treatments" : "Services", purpose: "Overview of core offerings", role: "services" });
    const wantsServicePages = services.length >= 2 || goals.has("rank in search") || /service pages|treatment pages|individual pages|seo/.test(notes);
    if (wantsServicePages) {
      for (const service of services.slice(0, healthcare ? 6 : 5)) {
        const slug = slugify(service);
        if (!slug) continue;
        pages.push({ id: `service-${slug}`, path: `/services/${slug}`, name: titleCase(service), primaryKeyword: service, purpose: `Dedicated ${service} conversion and search page`, role: "service-detail" });
      }
    }
  }

  if (healthcare || /doctor|team|staff|founder|leadership/.test(notes)) {
    pages.push({ id: "team", path: healthcare ? "/doctors" : "/team", name: healthcare ? "Doctors" : "Team", purpose: "Team credibility and human trust", role: "team" });
  }
  if (capabilities.has("gallery") || /gallery|portfolio|before.?after|case studies|our work/.test(notes)) {
    pages.push({ id: "gallery", path: healthcare ? "/results" : "/gallery", name: healthcare ? "Results" : "Gallery", purpose: "Visual proof and outcomes", role: "gallery" });
  }
  if (capabilities.has("blog") || goals.has("rank in search") || /blog|articles|resources|insights/.test(notes)) {
    pages.push({ id: "blog", path: "/blog", name: healthcare ? "Patient Resources" : "Insights", purpose: "Educational and organic search content hub", role: "blog" });
  }
  if (/faq|frequently asked|questions/.test(notes) || healthcare) {
    pages.push({ id: "faq", path: "/faq", name: "FAQs", purpose: "Answer objections and common questions", role: "faq" });
  }
  pages.push({ id: "contact", path: "/contact", name: goals.has("book appointments") ? "Book Appointment" : "Contact", purpose: "Final conversion and contact page", role: "contact" });

  const deduped = uniquePages(pages).slice(0, 14);
  return {
    pages: deduped,
    reasons: [
      "Sitemap derived from the brief instead of starter-page defaults.",
      services.length ? "Services are represented as a hub and, where useful, dedicated conversion/search pages." : "No unstated service pages were invented.",
      healthcare ? "Healthcare trust architecture includes team and FAQ pages by default." : "Industry-neutral trust architecture applied.",
      "Secondary pages use semantic registry intelligence for component selection, with deterministic recipes retained as a safe fallback.",
    ],
  };
}

export function applyPageArchitecture(site: Site, plan: PageArchitecturePlan): Site {
  const next = structuredClone(site);
  const home = next.pages.find((page) => page.path === "/") ?? next.pages[0];
  if (!home) return site;

  next.pages = plan.pages.map((pagePlan) => {
    const existing = next.pages.find((page) => page.path === pagePlan.path || page.id === pagePlan.id);
    const base = existing ? structuredClone(existing) : structuredClone(home);
    base.id = pagePlan.id;
    base.path = pagePlan.path;
    base.name = pagePlan.name;
    base.seo = {
      ...base.seo,
      title: seoTitle(pagePlan.name, next.name),
      description: seoDescription(pagePlan.purpose, next.name),
      canonicalPath: pagePlan.path,
      ...(pagePlan.primaryKeyword ? { primaryKeyword: pagePlan.primaryKeyword } : {}),
    };
    if (pagePlan.role !== "home") {
      base.sections = composePageSections(existing?.sections ?? [], home.sections, pagePlan.role, pagePlan.purpose, next);
    }
    return base;
  });
  next.navigation = plan.pages
    .filter((page) => !page.path.startsWith("/services/") && page.id !== "faq")
    .slice(0, 7)
    .map((page) => ({ label: page.name, href: page.path }));
  next.seoBlueprint = {
    ...next.seoBlueprint,
    servicePages: plan.pages.some((page) => page.path.startsWith("/services/")),
    blog: plan.pages.some((page) => page.id === "blog"),
  };
  return siteSchema.parse(next);
}

function composePageSections(
  existingSections: Site["pages"][number]["sections"],
  homeSections: Site["pages"][number]["sections"],
  role: Exclude<PageRole, "home">,
  purpose: string,
  site: Site,
) {
  const pool = [...existingSections, ...homeSections];
  const byFamily = new Map<SectionFamily, Site["pages"][number]["sections"][number]>();
  for (const section of pool) {
    const family = sectionFamily(section.component.componentId);
    if (family && !byFamily.has(family)) byFamily.set(family, section);
  }

  const recipe = PAGE_RECIPES[role];
  const selected = recipe
    .map((family, index) => ({ family, section: byFamily.get(family), index }))
    .filter((entry) => Boolean(entry.section))
    .map(({ family, section, index }) => {
      const next = structuredClone(section!);
      if (isLibraryFamily(family)) {
        const previousFamily = recipe[index - 1];
        const nextFamily = recipe[index + 1];
        const semanticId = selectSemanticComponentId({ family, role, site, previousFamily, nextFamily });
        if (semanticId) next.component = { componentId: semanticId, version: next.component.version };
      }
      next.props = { ...next.props, pagePurpose: purpose, pageRole: role };
      return next;
    });

  if (selected.length >= 3) return selected;
  const fallback = homeSections.map((section) => structuredClone(section));
  for (const section of fallback) section.props = { ...section.props, pagePurpose: purpose, pageRole: role };
  return fallback;
}

function selectSemanticComponentId(args: {
  family: Extract<LibrarySectionFamily, SectionFamily>;
  role: Exclude<PageRole, "home">;
  site: Site;
  previousFamily?: SectionFamily | undefined;
  nextFamily?: SectionFamily | undefined;
}): string | undefined {
  const intentSpec = ROLE_INTENTS[args.role][args.family] ?? defaultIntent(args.family);
  const candidates = seedSectionRegistryEntries.filter((entry) => entry.family === args.family && entry.theme === args.site.theme.family);
  if (!candidates.length) return undefined;

  const ranked = candidates
    .map((entry) => ({ entry, score: semanticRegistryScore(entry, intentSpec, args.site, args.previousFamily, args.nextFamily) }))
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id));

  return ranked[0]?.entry.id;
}

function semanticRegistryScore(
  entry: DesignRegistryEntry,
  desired: SectionIntent,
  site: Site,
  previousFamily?: SectionFamily,
  nextFamily?: SectionFamily,
) {
  const intelligence = entry.intelligence;
  if (!intelligence) return -1_000;
  let score = entry.domainCompatibility[site.domain] ?? 0;
  score += entry.theme === site.theme.family ? 30 : 0;
  score += desired.conversionGoals.filter((goal) => intelligence.conversionGoals.includes(goal)).length * 12;
  score += intelligence.placementRoles.includes(desired.placementRole) ? 18 : 0;
  score += desired.targetContentDensity === intelligence.contentDensity ? 8 : 0;
  score += desired.targetVisualWeight === intelligence.visualWeight ? 8 : 0;
  score += site.theme.modifiers.filter((modifier) => entry.modifiers.includes(modifier)).length * 3;
  score += entry.brandPersonalities.some((personality) => semanticBrandSignals(site).includes(personality)) ? 5 : 0;
  score += intelligence.mobileSuitability * 0.08;
  score += intelligence.aiPriority * 0.04;

  if (desired.preferImage === true) {
    score += intelligence.imageRequirement === "required" || intelligence.imageRequirement === "recommended" ? 12 : intelligence.imageRequirement === "optional" ? 4 : -8;
  } else if (desired.preferImage === false) {
    score += intelligence.imageRequirement === "none" || intelligence.imageRequirement === "optional" ? 8 : -4;
  }

  if (previousFamily) {
    if (intelligence.avoidAdjacent.includes(previousFamily)) score -= 100;
    else if (intelligence.idealPredecessors.includes(previousFamily)) score += 14;
  }
  if (nextFamily) {
    if (intelligence.avoidAdjacent.includes(nextFamily)) score -= 100;
    else if (intelligence.idealSuccessors.includes(nextFamily)) score += 10;
  }

  return score;
}

function semanticBrandSignals(site: Site): string[] {
  const signals = new Set<string>();
  for (const modifier of site.theme.modifiers) {
    if (modifier === "rounded") signals.add("approachable");
    if (modifier === "photography-led") signals.add("premium");
    if (modifier === "geometric") signals.add("structured");
    if (modifier === "motion-rich") signals.add("energetic");
    if (modifier === "motion-subtle") signals.add("refined");
    if (modifier === "dark") signals.add("premium");
  }
  return [...signals];
}

function defaultIntent(family: SectionFamily): SectionIntent {
  if (family === "navbar") return intent(["navigation", "conversion"], "opening", false, "low", "light");
  if (family === "hero") return intent(["lead-generation", "awareness"], "opening", true, "low", "medium");
  if (family === "cta") return intent(["lead-generation", "sales"], "conversion", false, "low", "medium");
  if (family === "contact") return intent(["lead-generation", "enquiries"], "closing", false, "medium", "light");
  if (family === "footer") return intent(["navigation", "trust"], "closing", false, "medium", "light");
  return intent(["trust", "education"], "core-content", true, "medium", "medium");
}

function intent(
  conversionGoals: string[],
  placementRole: PlacementRole,
  preferImage?: boolean,
  targetContentDensity?: Density,
  targetVisualWeight?: VisualWeight,
): SectionIntent {
  return {
    conversionGoals,
    placementRole,
    ...(preferImage !== undefined ? { preferImage } : {}),
    ...(targetContentDensity !== undefined ? { targetContentDensity } : {}),
    ...(targetVisualWeight !== undefined ? { targetVisualWeight } : {}),
  };
}

function isLibraryFamily(family: SectionFamily): family is Extract<LibrarySectionFamily, SectionFamily> {
  return Object.prototype.hasOwnProperty.call(FAMILY_CODES, family);
}

function sectionFamily(componentId: string): SectionFamily | undefined {
  const id = componentId.toLowerCase();
  if (/nav|navbar/.test(id)) return "navbar";
  if (/foot/.test(id)) return "footer";
  if (/hero/.test(id)) return "hero";
  if (/testimonial|proof|review/.test(id)) return "testimonials";
  if (/service|treatment/.test(id)) return "services";
  if (/feature|benefit|faq/.test(id)) return "features";
  if (/process|step|journey/.test(id)) return "process";
  if (/gallery|case|result/.test(id)) return "gallery";
  if (/team|doctor|staff/.test(id)) return "team";
  if (/contact|form/.test(id)) return "contact";
  if (/cta|call.to.action/.test(id)) return "cta";
  if (/about|story|intro/.test(id)) return "about";
  return undefined;
}

function cleanService(value: string) { return value.trim().replace(/[.;:]+$/g, ""); }
function slugify(value: string) { return value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64); }
function titleCase(value: string) { return value.replace(/\b\w/g, (char) => char.toUpperCase()); }
function unique(values: string[]) { return [...new Set(values)]; }
function uniquePages(pages: ArchitecturePage[]) { const seen = new Set<string>(); return pages.filter((page) => { if (seen.has(page.path)) return false; seen.add(page.path); return true; }); }
function seoTitle(pageName: string, businessName: string) { return `${pageName} | ${businessName}`.slice(0, 70); }
function seoDescription(purpose: string, businessName: string) { return `${purpose} for ${businessName}.`.slice(0, 180); }