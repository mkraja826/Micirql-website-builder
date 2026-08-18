import { siteSchema, type Site } from "@micirql/schema";

const CONTENT_FAMILIES = new Set(["hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form"]);
const GENERIC_HEADINGS = new Set(["home", "about", "services", "features", "process", "testimonials", "gallery", "team", "contact"]);
const GENERIC_CTA_LABELS = new Set(["get started", "learn more", "next", "continue"]);

type RepairContext = {
  dental: boolean;
  focus: string;
  location: string | null;
  primaryGoal: string;
};

export function repairContentDepth(site: Site): Site {
  const next = structuredClone(site);
  const context = repairContext(next);
  for (const page of next.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = familyFromId(section.component.componentId);
      if (!family || !CONTENT_FAMILIES.has(family)) continue;
      const props = section.props as Record<string, unknown>;
      const originalHeading = text(props.heading) ?? text(props.title) ?? defaultHeading(family);
      const heading = repairHeading(originalHeading, family, next.name, context);
      if (heading !== originalHeading) {
        if ("heading" in props || !("title" in props)) props.heading = heading;
        else props.title = heading;
      }
      repairPrimaryAction(props, context);
      const body = text(props.body) ?? text(props.description);
      if (!body || body.length < 48) {
        const value = sectionParagraph(family, next.name, heading, context);
        if ("description" in props && !("body" in props)) props.description = value;
        else props.body = value;
      }
      if (Array.isArray(props.items)) {
        props.items = props.items.map((item, index) => repairItem(item, family, index));
      }
      section.props = props;
    }
  }
  return siteSchema.parse(next);
}

function repairItem(value: unknown, family: string, index: number): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const item = { ...(value as Record<string, unknown>) };
  const title = text(item.title) ?? text(item.heading) ?? `Item ${index + 1}`;
  const description = text(item.description) ?? text(item.body);
  if (!description || description.length < 28) {
    const copy = itemParagraph(family, title);
    if ("body" in item && !("description" in item)) item.body = copy;
    else item.description = copy;
  }
  return item;
}

function repairHeading(value: string, family: string, businessName: string, context: RepairContext): string {
  if (!isWeakHeading(value)) return value;
  if (context.dental) {
    switch (family) {
      case "hero": return `${context.focus}${context.location ? ` in ${context.location}` : ""}`;
      case "about": return `About ${businessName}`;
      case "services": return "Dental treatments and services";
      case "features": return "What to expect from your dental care";
      case "process": return "Your dental care journey";
      case "testimonials": return "Patient experience and trust";
      case "gallery": return "Clinic and treatment gallery";
      case "team": return "About the dental team";
      case "cta": return "Ready to discuss your dental care?";
      case "contact":
      case "lead-capture":
      case "form": return `Contact ${businessName}`;
      default: return context.focus;
    }
  }
  if (family === "cta") return `Ready to talk with ${businessName}?`;
  if (family === "contact" || family === "lead-capture" || family === "form") return `Contact ${businessName}`;
  if (GENERIC_HEADINGS.has(normalize(value))) return defaultHeading(family);
  return sentenceCase(value);
}

function repairPrimaryAction(props: Record<string, unknown>, context: RepairContext) {
  const action = props.primaryAction;
  if (!action || typeof action !== "object" || Array.isArray(action)) return;
  const next = { ...(action as Record<string, unknown>) };
  const label = text(next.label);
  if (!label || !GENERIC_CTA_LABELS.has(normalize(label))) return;
  if (context.dental) {
    const goal = normalize(context.primaryGoal);
    next.label = /consult/.test(goal) ? "Request a consultation" : /book|appointment/.test(goal) ? "Book an appointment" : "Contact the clinic";
  } else {
    next.label = "Contact us";
  }
  props.primaryAction = next;
}

function sectionParagraph(family: string, businessName: string, heading: string, context: RepairContext): string {
  if (context.dental) {
    switch (family) {
      case "hero": return `${businessName} presents clear information about ${context.focus.toLowerCase()} so visitors can understand the treatments listed by the clinic and choose an appropriate next step.`;
      case "services": return `Explore the dental services listed by ${businessName}, with straightforward information to help visitors understand each option before requesting an appointment.`;
      case "features": return `Learn about the practical details that shape dental care at ${businessName}, using only clinic-supplied facts about the experience, technology and approach.`;
      case "process": return `See the typical steps from first enquiry through consultation and the next appropriate action, without promising a particular treatment result or timeline.`;
      case "cta": return `Have a question about your dental care? Use the available appointment or contact option to reach ${businessName} and discuss the next appropriate step.`;
      case "contact":
      case "lead-capture":
      case "form": return `Contact ${businessName} using the verified details or enquiry form provided here. Add confirmed opening hours and location information before publishing.`;
      default: break;
    }
  }
  switch (family) {
    case "hero": return `${businessName} provides clear information about ${heading.toLowerCase()} so visitors can understand their options, explore relevant services and take the next step with confidence.`;
    case "about": return `${businessName} uses this space to explain the business, its approach and the practical details visitors need before deciding whether to get in touch.`;
    case "services": return `Explore the services available from ${businessName}, with straightforward information about what each option is for and how visitors can learn more.`;
    case "features": return `Learn what shapes the experience at ${businessName}, from the way the service is delivered to the practical details that help visitors make an informed choice.`;
    case "process": return `See the typical steps from first enquiry to the next appropriate action, so visitors know what to expect before they contact ${businessName}.`;
    case "testimonials": return `Verified customer feedback can be presented here to help visitors understand real experiences with ${businessName} without inventing claims or endorsements.`;
    case "gallery": return `Use this section to explore relevant work, spaces or visual examples connected to ${businessName}, with each image kept editable in the builder.`;
    case "team": return `Meet the people behind ${businessName} and add verified roles, qualifications and biographies so visitors can understand who they may interact with.`;
    case "pricing": return `Review the available options and add confirmed pricing details where appropriate, keeping every amount and inclusion editable before publishing.`;
    case "cta": return `Have a question or want to continue? Use the available contact or enquiry option to reach ${businessName} and choose the next step that suits you.`;
    case "contact":
    case "lead-capture":
    case "form": return `Contact ${businessName} using the details or enquiry form provided here. Add any verified opening hours, location information or response expectations before publishing.`;
    default: return `${heading} is explained here with enough context for visitors to understand the section and decide what they want to do next.`;
  }
}

function itemParagraph(family: string, title: string): string {
  if (family === "process") return `Understand what happens during ${title.toLowerCase()} and what information or action may be needed before moving to the next step.`;
  if (family === "team") return `Add verified information about ${title}, including the person’s role, relevant experience and any details visitors should know.`;
  if (family === "testimonials") return `Add a verified customer comment for ${title} here rather than publishing generated or unconfirmed feedback.`;
  return `Learn more about ${title}, including the key details visitors need to understand this option and decide whether it is relevant to them.`;
}

function repairContext(site: Site): RepairContext {
  const subtype = text(site.subtype) ?? "";
  const industryText = [site.domain, subtype, site.seoBlueprint.primaryGoal, ...site.seoBlueprint.priorityTopics].filter(Boolean).join(" ").toLowerCase();
  const dental = /dental|dentist|dentistry|implant|orthodont|endodont|root canal|oral care/.test(industryText);
  const focus = dentalFocus(subtype, industryText);
  const location = site.seoBlueprint.targetLocations.find((value) => Boolean(text(value)))?.trim() || null;
  return { dental, focus, location, primaryGoal: site.seoBlueprint.primaryGoal ?? "" };
}

function dentalFocus(subtype: string, textValue: string): string {
  const value = `${subtype} ${textValue}`.toLowerCase();
  if (/implant/.test(value)) return "Dental implant care";
  if (/cosmetic|veneer|smile design/.test(value)) return "Cosmetic dentistry";
  if (/orthodont|aligner|braces/.test(value)) return "Orthodontic care";
  if (/endodont|root canal/.test(value)) return "Root canal and endodontic care";
  return "Dental care";
}

function isWeakHeading(value: string): boolean {
  const normalized = normalize(value).replace(/[?.!]+$/, "");
  if (GENERIC_HEADINGS.has(normalized)) return true;
  if (/^(ready to discuss|a clear overview of|what matters about|explore) (home|services|treatments|contact|doctor|cases)$/.test(normalized)) return true;
  if (/all dental related treatments/.test(normalized)) return true;
  return excessiveCaps(value);
}

function excessiveCaps(value: string): boolean {
  const letters = [...value].filter((char) => /[a-z]/i.test(char));
  if (letters.length < 20 || value.trim().split(/\s+/).length < 4) return false;
  const upper = letters.filter((char) => char === char.toUpperCase()).length;
  return upper / letters.length >= 0.78;
}

function sentenceCase(value: string): string {
  const cleaned = value.trim().toLowerCase();
  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}` : value;
}

function defaultHeading(family: string): string {
  return family.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", services: "services", feat: "features", features: "features", proc: "process", process: "process", test: "testimonials", testimonials: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", cont: "contact", contact: "contact", foot: "footer", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function normalize(value: string): string { return value.trim().toLowerCase().replace(/\s+/g, " "); }
function text(value: unknown): string | undefined { return typeof value === "string" && value.trim() ? value.trim() : undefined; }
