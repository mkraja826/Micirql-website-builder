import { siteSchema, type Site } from "@micirql/schema";

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
      "Each secondary page receives a purpose-specific section composition instead of inheriting the homepage skeleton.",
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
      base.sections = composePageSections(existing?.sections ?? [], home.sections, pagePlan.role, pagePlan.purpose);
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

function composePageSections(existingSections: Site["pages"][number]["sections"], homeSections: Site["pages"][number]["sections"], role: Exclude<PageRole, "home">, purpose: string) {
  const pool = [...existingSections, ...homeSections];
  const byFamily = new Map<SectionFamily, Site["pages"][number]["sections"][number]>();
  for (const section of pool) {
    const family = sectionFamily(section.component.componentId);
    if (family && !byFamily.has(family)) byFamily.set(family, section);
  }
  const selected = PAGE_RECIPES[role]
    .map((family) => byFamily.get(family))
    .filter((section): section is Site["pages"][number]["sections"][number] => Boolean(section))
    .map((section) => {
      const next = structuredClone(section);
      next.props = { ...next.props, pagePurpose: purpose, pageRole: role };
      return next;
    });
  if (selected.length >= 3) return selected;
  const fallback = homeSections.map((section) => structuredClone(section));
  for (const section of fallback) section.props = { ...section.props, pagePurpose: purpose, pageRole: role };
  return fallback;
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
