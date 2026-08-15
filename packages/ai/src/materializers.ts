import { brandTokensSchema, type BrandTokens, type SitePlan } from "@micirql/schema";
import type {
  BrandTokenResolver,
  BuildContext,
  PageSeoResolver,
  SectionMaterializer,
} from "./build-orchestrator";

export type MaterializationFacts = {
  brand?: {
    logoAssetId?: string;
    colors?: Partial<BrandTokens["colors"]>;
    typography?: Partial<BrandTokens["typography"]>;
  };
  business: Record<string, unknown>;
};

export type MaterializationFactSource = {
  get(context: BuildContext): Promise<MaterializationFacts>;
};

export type StructuredMaterializerModel = {
  generate(args: {
    task: "section-content" | "page-seo";
    system: string;
    input: unknown;
  }): Promise<unknown>;
};

export function createDefaultBrandTokenResolver(facts: MaterializationFactSource): BrandTokenResolver {
  return {
    async resolve({ plan, context }) {
      const supplied = await facts.get(context);
      const palette = supplied.brand?.colors ?? {};
      const typography = supplied.brand?.typography ?? {};
      const defaults = paletteFor(plan.design.theme, plan.brand.preferredSurface);

      return brandTokensSchema.parse({
        ...(supplied.brand?.logoAssetId ? { logoAssetId: supplied.brand.logoAssetId } : {}),
        colors: { ...defaults, ...palette },
        typography: {
          display: typography.display ?? "Inter",
          body: typography.body ?? "Inter",
          ui: typography.ui ?? "Inter",
          ...(typography.mono ? { mono: typography.mono } : {}),
        },
        density: densityFor(plan.brand.visualWeight),
        shape: shapeFor(plan.brand.geometry),
        motion: plan.brand.motionPreference,
      });
    },
  };
}

export function createGovernedSectionMaterializer(args: {
  facts: MaterializationFactSource;
  model?: StructuredMaterializerModel;
}): SectionMaterializer {
  return {
    async materialize({ plan, page, family, componentId, version, context }) {
      const supplied = await args.facts.get(context);
      const safeFacts = sanitizeFacts(supplied.business);
      const bindings = bindingsFor(page.requiredFunctions, family);

      if (!args.model) {
        return {
          props: deterministicSectionProps(plan, page, family, safeFacts),
          bindings,
        };
      }

      const raw = await args.model.generate({
        task: "section-content",
        system: [
          "Return a JSON object of presentation props only.",
          "Use only facts present in suppliedFacts.",
          "Do not invent prices, credentials, ratings, guarantees, availability, statistics, locations, people, testimonials, awards, outcomes, inventory, or medical claims.",
          "Do not create action endpoints or function IDs.",
          "Omit information when the source facts do not support it.",
        ].join("\n"),
        input: { page, family, componentId, version, suppliedFacts: safeFacts },
      });

      const props = normalizeObject(raw);
      assertNoUnsupportedClaims(props, safeFacts);
      return { props, bindings };
    },
  };
}

export function createGovernedPageSeoResolver(args: {
  facts: MaterializationFactSource;
  model?: StructuredMaterializerModel;
}): PageSeoResolver {
  return {
    async resolve({ plan, page, context }) {
      const supplied = await args.facts.get(context);
      const safeFacts = sanitizeFacts(supplied.business);
      const fallback = deterministicSeo(plan, page);

      if (!args.model) return fallback;

      const raw = normalizeObject(await args.model.generate({
        task: "page-seo",
        system: [
          "Return JSON with title, description, optional primaryKeyword, optional structuredDataTypes, and optional indexable.",
          "Use only the supplied business facts and SitePlan.",
          "Never invent locations, services, credentials, awards, ratings, prices, availability, guarantees, results, or other claims.",
          "Title must be at most 70 characters. Description must be at most 180 characters.",
          "Structured data types describe page type only; they do not authorize fabricated rich-result fields.",
        ].join("\n"),
        input: { business: plan.business, page, suppliedFacts: safeFacts },
      }));

      assertNoUnsupportedClaims(raw, safeFacts);
      const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 70) : fallback.title;
      const description = typeof raw.description === "string" ? raw.description.trim().slice(0, 180) : fallback.description;
      if (!title || !description) throw new Error("SEO materializer returned empty title or description.");

      return {
        title,
        description,
        ...(typeof raw.primaryKeyword === "string" && raw.primaryKeyword.trim()
          ? { primaryKeyword: raw.primaryKeyword.trim() }
          : fallback.primaryKeyword ? { primaryKeyword: fallback.primaryKeyword } : {}),
        structuredDataTypes: Array.isArray(raw.structuredDataTypes)
          ? raw.structuredDataTypes.filter((item): item is string => typeof item === "string").slice(0, 4)
          : fallback.structuredDataTypes,
        indexable: typeof raw.indexable === "boolean" ? raw.indexable : true,
      };
    },
  };
}

function deterministicSectionProps(
  plan: SitePlan,
  page: SitePlan["pages"][number],
  family: string,
  facts: Record<string, unknown>,
): Record<string, unknown> {
  const props: Record<string, unknown> = {
    businessName: plan.business.businessName,
    pageName: page.name,
    purpose: page.purpose,
    family,
  };
  for (const [key, value] of Object.entries(facts)) {
    if (isSafePrimitive(value) || isSafePrimitiveArray(value)) props[key] = value;
  }
  return props;
}

function deterministicSeo(plan: SitePlan, page: SitePlan["pages"][number]) {
  const title = `${page.name} | ${plan.business.businessName}`.slice(0, 70);
  const topic = page.name.toLowerCase();
  const description = `${page.purpose} Learn more from ${plan.business.businessName}.`.slice(0, 180);
  return {
    title,
    description,
    primaryKeyword: topic,
    structuredDataTypes: structuredTypesFor(plan.business.domain, page.path),
    indexable: true,
  };
}

function bindingsFor(functions: string[], family: string) {
  if (functions.length === 0) return {};
  const interactive = new Set(["contact", "lead-capture", "form", "cta", "booking", "enquiry"]);
  if (!interactive.has(family)) return {};
  return Object.fromEntries(functions.map((actionId, index) => [
    `action${index + 1}`,
    { actionId, inputMap: {} },
  ]));
}

function paletteFor(theme: SitePlan["design"]["theme"], surface: SitePlan["brand"]["preferredSurface"]): BrandTokens["colors"] {
  const dark = surface === "dark" || ["cinematic", "futuristic"].includes(theme);
  return dark
    ? {
        primary: "#F5F5F5", secondary: "#B8B8B8", accent: "#8B5CF6", background: "#0A0A0A",
        surface: "#141414", textPrimary: "#FFFFFF", textSecondary: "#B8B8B8", border: "#2A2A2A",
        success: "#22C55E", warning: "#F59E0B", error: "#EF4444",
      }
    : {
        primary: "#18181B", secondary: "#52525B", accent: "#7C3AED", background: "#FFFFFF",
        surface: "#F7F7F8", textPrimary: "#18181B", textSecondary: "#52525B", border: "#E4E4E7",
        success: "#16A34A", warning: "#D97706", error: "#DC2626",
      };
}

function densityFor(weight: SitePlan["brand"]["visualWeight"]): BrandTokens["density"] {
  if (weight === "light") return "spacious";
  if (weight === "heavy") return "compact";
  return "comfortable";
}

function shapeFor(geometry: SitePlan["brand"]["geometry"]): BrandTokens["shape"] {
  if (geometry === "sharp") return "sharp";
  if (geometry === "rounded" || geometry === "organic") return "soft";
  return "balanced";
}

function structuredTypesFor(domain: SitePlan["business"]["domain"], path: string): string[] {
  if (path !== "/") return ["WebPage"];
  const map: Partial<Record<SitePlan["business"]["domain"], string>> = {
    clinic: "MedicalBusiness",
    restaurant: "Restaurant",
    "real-estate": "RealEstateAgent",
    corporate: "Organization",
    education: "EducationalOrganization",
    hospitality: "LodgingBusiness",
  };
  return [map[domain] ?? "Organization", "WebSite"];
}

function sanitizeFacts(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => isSafePrimitive(item) || isSafePrimitiveArray(item)));
}

function assertNoUnsupportedClaims(output: Record<string, unknown>, facts: Record<string, unknown>): void {
  const source = JSON.stringify(facts).toLowerCase();
  const sensitiveKeys = /(price|rating|award|credential|certif|guarantee|availability|testimonial|result|outcome|years|doctor|location|address|inventory|discount)/i;
  walk(output, (key, value) => {
    if (!sensitiveKeys.test(key)) return;
    if (typeof value !== "string" && typeof value !== "number") return;
    const needle = String(value).trim().toLowerCase();
    if (needle && !source.includes(needle)) throw new Error(`Unsupported claim detected in materialized field: ${key}`);
  });
}

function walk(value: unknown, visit: (key: string, value: unknown) => void): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, child);
    walk(child, visit);
  }
}

function normalizeObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { value = JSON.parse(cleaned); } catch { throw new Error("Materializer returned invalid JSON."); }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Materializer must return a JSON object.");
  return value as Record<string, unknown>;
}

function isSafePrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function isSafePrimitiveArray(value: unknown): value is Array<string | number | boolean | null> {
  return Array.isArray(value) && value.every(isSafePrimitive);
}
