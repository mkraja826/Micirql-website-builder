import { siteSchema, type Site } from "@micirql/schema";

const CONTENT_FAMILIES = new Set(["hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form"]);

export function repairContentDepth(site: Site): Site {
  const next = structuredClone(site);
  for (const page of next.pages) {
    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = familyFromId(section.component.componentId);
      if (!family || !CONTENT_FAMILIES.has(family)) continue;
      const props = section.props as Record<string, unknown>;
      const heading = text(props.heading) ?? text(props.title) ?? defaultHeading(family);
      const body = text(props.body) ?? text(props.description);
      if (!body || body.length < 48) {
        const value = sectionParagraph(family, next.name, heading);
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

function sectionParagraph(family: string, businessName: string, heading: string): string {
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

function defaultHeading(family: string): string {
  return family.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function familyFromId(componentId: string): string | undefined {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "pricing", "cta", "contact", "lead-capture", "form", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", services: "services", features: "features", process: "process", testimonials: "testimonials", gallery: "gallery", team: "team", pricing: "pricing", cta: "cta", contact: "contact", footer: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
