import { siteSchema, type Site } from "@micirql/schema";
import type { GroundingFacts } from "@micirql/design-engine";

type SiteSection = Site["pages"][number]["sections"][number];

type PreparedContentScaffold = {
  site: Site;
  changed: boolean;
  repairs: string[];
};

const ITEM_FAMILIES = new Set(["services", "features", "process", "testimonials", "gallery", "team"]);

/**
 * Converts the low-level build-site skeleton into a truthful content scaffold before
 * any model is asked to rewrite copy. The content-generation contract deliberately
 * forbids models from adding/removing items, so empty item families must be made
 * structurally usable here rather than asking AI to violate its own safety boundary.
 *
 * No unsupported proof is invented: evidence-bearing sections stay hidden until
 * verified people/reviews/media are supplied. Services come only from supplied facts.
 */
export function prepareContentScaffold(site: Site, facts: GroundingFacts): PreparedContentScaffold {
  const next = structuredClone(site);
  const repairs: string[] = [];
  const services = cleanArray(facts.services);
  const people = cleanArray(facts.people);
  const businessName = text(facts.businessName) || next.name;
  const location = text(facts.location);
  const dental = isDental(facts, next);

  if (businessName && next.name !== businessName) {
    next.name = businessName;
    repairs.push("business-name");
  }
  if (text(facts.subindustry) && next.subtype !== text(facts.subindustry)) {
    next.subtype = text(facts.subindustry);
    repairs.push("subindustry");
  }
  if (services.length && JSON.stringify(next.seoBlueprint.priorityTopics) !== JSON.stringify(services)) {
    next.seoBlueprint.priorityTopics = [...services];
    repairs.push("service-topics");
  }
  if (location && !next.seoBlueprint.targetLocations.includes(location)) {
    next.seoBlueprint.targetLocations = [location, ...next.seoBlueprint.targetLocations.filter((item) => item !== location)].slice(0, 8);
    next.seoBlueprint.localSeo = true;
    repairs.push("location");
  }

  for (const page of next.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = familyFromId(section.component.componentId);
      if (!family || !ITEM_FAMILIES.has(family)) continue;
      const props = section.props as Record<string, unknown>;
      const items = Array.isArray(props.items) ? props.items : [];
      if (items.length) continue;

      if (family === "services") {
        const seeded = serviceItems(services, dental);
        if (seeded.length) {
          props.items = seeded;
          repairs.push(`${section.id}:services`);
        }
      } else if (family === "features") {
        props.items = dental ? dentalFeatureItems() : generalFeatureItems();
        repairs.push(`${section.id}:features`);
      } else if (family === "process") {
        props.items = dental ? dentalProcessItems() : generalProcessItems();
        repairs.push(`${section.id}:process`);
      } else if (family === "team") {
        if (people.length) {
          props.items = people.slice(0, 6).map((person) => ({
            title: person,
            description: `${person} is listed in the verified team information supplied for ${businessName}.`,
          }));
          repairs.push(`${section.id}:team`);
        } else {
          section.hidden = true;
          repairs.push(`${section.id}:hide-unverified-team`);
        }
      } else if (family === "testimonials") {
        section.hidden = true;
        repairs.push(`${section.id}:hide-unverified-proof`);
      } else if (family === "gallery") {
        section.hidden = true;
        repairs.push(`${section.id}:hide-empty-gallery`);
      }
      section.props = props;
    }
  }

  const parsed = siteSchema.parse(next);
  return { site: parsed, changed: repairs.length > 0, repairs };
}

function serviceItems(services: string[], dental: boolean) {
  return services.slice(0, 6).map((service) => ({
    title: sentenceCase(service),
    description: dental
      ? `Understand what ${service.toLowerCase()} is for, what an assessment may involve, and which questions to discuss with the clinic before deciding on care.`
      : `Understand what ${service.toLowerCase()} covers, who it may be relevant for, and the practical next step for discussing it with the business.`,
  }));
}

function dentalFeatureItems() {
  return [
    { title: "Clear treatment information", description: "Review the available options, what each stage is for, and the questions to discuss before deciding on dental care." },
    { title: "Individual assessment", description: "Treatment recommendations depend on an individual assessment and the verified information available to the clinic." },
    { title: "Practical next steps", description: "Use the clinic’s contact or appointment options to ask questions and understand the next appropriate step." },
  ];
}

function dentalProcessItems() {
  return [
    { title: "Initial enquiry", description: "Share the reason for your visit and arrange the appropriate consultation or assessment with the clinic." },
    { title: "Consultation and assessment", description: "Discuss your concerns, relevant history and available treatment options before any plan is confirmed." },
    { title: "Treatment planning", description: "Review the recommended next steps, expected stages and verified clinic information before deciding how to proceed." },
  ];
}

function generalFeatureItems() {
  return [
    { title: "Clear information", description: "Review the available service information and the practical details that matter before choosing a next step." },
    { title: "Needs-led planning", description: "Discuss what you need and use the supplied business information to understand which option may be relevant." },
    { title: "Practical next steps", description: "Use the available contact or enquiry options to ask questions and agree the appropriate next action." },
  ];
}

function generalProcessItems() {
  return [
    { title: "Initial enquiry", description: "Share what you need and provide the information required for the business to understand your request." },
    { title: "Review your needs", description: "Discuss the relevant options and practical details before deciding on the most appropriate direction." },
    { title: "Agree the next step", description: "Confirm the next action using the contact, booking or enquiry option provided by the business." },
  ];
}

function isDental(facts: GroundingFacts, site: Site) {
  const value = [facts.industry, facts.subindustry, site.domain, site.subtype, ...cleanArray(facts.services)].filter(Boolean).join(" ").toLowerCase();
  return /dental|dentist|dentistry|implant|orthodont|endodont|root canal|oral care/.test(value);
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const upper = componentId.toUpperCase();
  const codes: Record<string, string> = { NAV: "navbar", HERO: "hero", ABOUT: "about", SERV: "services", FEAT: "features", PROC: "process", TEST: "testimonials", GALL: "gallery", TEAM: "team", CTA: "cta", CONT: "contact", FOOT: "footer" };
  for (const [code, family] of Object.entries(codes)) if (upper.includes(`-${code}-`)) return family;
  return undefined;
}

function cleanArray(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.map(text).filter(Boolean))].slice(0, 48) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : value;
}
