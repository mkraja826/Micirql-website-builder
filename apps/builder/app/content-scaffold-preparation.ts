import { siteSchema, type Site } from "@micirql/schema";
import type { GroundingFacts } from "@micirql/design-engine";

type SiteSection = Site["pages"][number]["sections"][number];

type PreparedContentScaffold = {
  site: Site;
  changed: boolean;
  repairs: string[];
};

const ITEM_FAMILIES = new Set(["services", "features", "process", "testimonials", "gallery", "team"]);
const SCAFFOLD_TEXT = /content for this section will be tailored|a tailored website is being prepared|explore the services and solutions we provide|contact us to discuss how we can help|primary offering|supporting offering|additional offering|point (one|two|three|four|five)|team member|verified proof|image slot/i;

/**
 * Converts the low-level build-site skeleton into a truthful, acceptance-safe content
 * scaffold before any model is asked to rewrite copy. The content-generation contract
 * deliberately forbids models from adding/removing items or creating action targets,
 * so those structural requirements must exist before AI enrichment starts.
 *
 * No unsupported proof is invented: evidence-bearing sections stay hidden until
 * verified people/reviews/media are supplied. Services come only from supplied facts.
 * The deterministic copy is intentionally factual and conservative so it remains a
 * usable production fallback when a text-model provider is unavailable.
 */
export function prepareContentScaffold(site: Site, facts: GroundingFacts): PreparedContentScaffold {
  const next = structuredClone(site);
  const repairs: string[] = [];
  const services = cleanArray(facts.services);
  const people = cleanArray(facts.people);
  const goals = cleanArray(facts.goals);
  const businessName = text(facts.businessName) || next.name;
  const location = text(facts.location);
  const dental = isDental(facts, next);
  const conversionLabel = preferredConversionLabel(goals, dental);

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
    const contactSection = page.sections.find((section) => !section.hidden && familyFromId(section.component.componentId) === "contact");
    const contactHref = contactSection ? `#${contactSection.id}` : "#contact";

    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = familyFromId(section.component.componentId);
      if (!family) continue;
      const props = section.props as Record<string, unknown>;
      const scaffoldComponent = section.component.componentId.toLowerCase().endsWith(".placeholder");

      if (scaffoldComponent || hasScaffoldCopy(props)) {
        const copy = sectionFallbackCopy({ family, businessName, location, services, dental });
        if (copy) {
          if (shouldReplaceHeading(props, scaffoldComponent)) {
            setHeading(props, copy.heading);
            repairs.push(`${section.id}:heading`);
          }
          if (copy.body && shouldReplaceBody(props, scaffoldComponent)) {
            setBody(props, copy.body);
            repairs.push(`${section.id}:body`);
          }
        }
      }

      if ((family === "hero" || family === "cta") && !hasAction(props.primaryAction)) {
        props.primaryAction = { label: conversionLabel, href: contactHref };
        repairs.push(`${section.id}:primary-action`);
      }

      if (ITEM_FAMILIES.has(family)) {
        const items = Array.isArray(props.items) ? props.items : [];
        if (!items.length) {
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
        }
      }
      section.props = props;
    }
  }

  const parsed = siteSchema.parse(next);
  return { site: parsed, changed: repairs.length > 0, repairs };
}

function sectionFallbackCopy(input: { family: string; businessName: string; location: string; services: string[]; dental: boolean }) {
  const { family, businessName, location, services, dental } = input;
  const primaryService = services[0] ? sentenceCase(services[0]) : dental ? "Dental care" : "Services";
  const serviceList = naturalList(services.slice(0, 3).map(sentenceCase));
  const place = location ? ` in ${location}` : "";

  if (family === "navbar") return { heading: businessName, body: dental ? "Explore treatments, clinic information and ways to get in touch." : "Explore services, business information and ways to get in touch." };
  if (family === "hero") return {
    heading: dental ? `${primaryService} with clear next steps` : `${primaryService} with ${businessName}`,
    body: dental
      ? `${serviceList ? `Explore ${serviceList}` : "Explore available dental care"}${place} and discuss which options may be relevant before deciding on treatment.`
      : `${serviceList ? `Explore ${serviceList}` : "Explore the available services"}${place} and discuss the practical next step with ${businessName}.`,
  };
  if (family === "services") return {
    heading: dental ? "Treatment options to explore" : "Services to explore",
    body: dental
      ? `Review the treatment areas available through ${businessName} and discuss which options may be relevant to your needs.`
      : `Review the services available through ${businessName} and choose the right starting point for your enquiry.`,
  };
  if (family === "features") return {
    heading: dental ? "Clear information before treatment" : "Clear information before you decide",
    body: dental
      ? "Understand the available options, the role of an individual assessment and the practical next steps before deciding on care."
      : "Understand the available options, practical considerations and next steps before deciding how you would like to proceed.",
  };
  if (family === "process") return {
    heading: dental ? "From enquiry to treatment planning" : "What happens next",
    body: dental
      ? "Start with an enquiry, discuss your needs during an assessment and review the proposed next steps before treatment is confirmed."
      : "Start with an enquiry, review the relevant options and agree the practical next step with the business.",
  };
  if (family === "team") return { heading: "Meet the team", body: `Meet the people included in the verified team information for ${businessName}.` };
  if (family === "testimonials") return { heading: "Patient feedback", body: "Verified patient feedback can be shown here when it is supplied by the clinic." };
  if (family === "gallery") return { heading: "Clinic and treatment gallery", body: "Verified clinic, team or treatment imagery can be shown here when it is supplied." };
  if (family === "cta") return {
    heading: dental ? "Discuss your treatment options" : "Discuss the right next step",
    body: dental
      ? `Ask about ${primaryService.toLowerCase()} and the consultation or assessment that may be appropriate for your needs.`
      : `Tell ${businessName} what you need and use the enquiry to agree the most appropriate next step.`,
  };
  if (family === "contact") return {
    heading: dental ? "Plan your consultation" : "Start an enquiry",
    body: dental
      ? "Share what you would like help with so the clinic can guide you to the appropriate consultation or assessment."
      : "Share what you need so the business can respond with the most appropriate next step.",
  };
  if (family === "footer") return {
    heading: businessName,
    body: dental
      ? `${businessName}${place} — treatment information, consultation guidance and contact options.`
      : `${businessName}${place} — service information and contact options.`,
  };
  return undefined;
}

function serviceItems(services: string[], dental: boolean) {
  return services.slice(0, 6).map((service) => ({
    title: sentenceCase(service),
    description: dental
      ? `Understand what ${service.toLowerCase()} is for, what an assessment may involve, and which questions to discuss before deciding on care.`
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

function preferredConversionLabel(goals: string[], dental: boolean) {
  const goalText = goals.join(" ").toLowerCase();
  if (dental && /book|appointment|consult/.test(goalText)) return "Book consultation";
  if (dental) return "Contact clinic";
  return "Send enquiry";
}

function shouldReplaceHeading(props: Record<string, unknown>, scaffoldComponent: boolean) {
  const current = text(props.heading) || text(props.title);
  return !current || scaffoldComponent || SCAFFOLD_TEXT.test(current);
}

function shouldReplaceBody(props: Record<string, unknown>, scaffoldComponent: boolean) {
  const current = text(props.body) || text(props.description);
  return !current || scaffoldComponent || SCAFFOLD_TEXT.test(current);
}

function setHeading(props: Record<string, unknown>, value: string) {
  if ("title" in props && !("heading" in props)) props.title = value;
  else props.heading = value;
}

function setBody(props: Record<string, unknown>, value: string) {
  if ("description" in props && !("body" in props)) props.description = value;
  else props.body = value;
}

function hasAction(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const action = value as Record<string, unknown>;
  return Boolean(text(action.label) && text(action.href));
}

function hasScaffoldCopy(props: Record<string, unknown>) {
  return [props.heading, props.title, props.body, props.description].some((value) => SCAFFOLD_TEXT.test(text(value)));
}

function naturalList(values: string[]) {
  const clean = values.map((value) => value.trim()).filter(Boolean);
  if (clean.length <= 1) return clean[0] ?? "";
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean.at(-1)}`;
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
