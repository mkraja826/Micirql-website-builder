import {
  siteSchema,
  type CompositionGateIssue,
  type Site,
  type SiteSection,
} from "@micirql/schema";
import {
  FAMILY_CODES,
  SECTION_FAMILIES,
  type SectionFamily,
} from "@micirql/sections";
import { dentalServiceDescription } from "./dental-service-content";
import { normalizeServiceInput } from "./service-normalization";

const OPTIONAL_EVIDENCE_FAMILIES = new Set<SectionFamily>([
  "testimonials",
  "gallery",
  "team",
]);

const AUTHORING_INSTRUCTION_PATTERNS = [
  /\buse this section\b/i,
  /\b(?:add|insert|upload) (?:only )?(?:verified|approved|clinic-owned|accurately licensed)\b/i,
  /\bcan be added here\b/i,
  /\bremains intentionally unclaimed\b/i,
  /\b(?:once|after) the clinic supplies\b/i,
  /\busing only (?:approved|verified) (?:names|information|media|images|reviews|feedback)\b/i,
  /\bthis page should list only\b/i,
  /\bintroduce the people behind\b/i,
  /\bshow the (?:work|space|clinic|people|products|projects)\b/i,
  /\b(?:use|add|insert|show|display|include)\b[^.!?\n]{0,120}\b(?:neutral\s+)?placeholders?\b/i,
  /\bneutral\s+placeholders?\b/i,
  /\bapproved clinic (?:media|images?) only\b/i,
  /\bno fabricated (?:reviews|testimonials|claims)\b/i,
] as const;

const DENTAL_SECTION_HEADING_ALTERNATIVES: Partial<
  Record<SectionFamily, readonly string[]>
> = {
  hero: ["Plan your dental visit", "Dental care for your needs"],
  about: ["About the dental clinic", "Your dental care experience"],
  services: [
    "Dental care options",
    "Treatments available at the clinic",
    "Explore your treatment options",
  ],
  features: ["What to expect at the clinic", "Details for your visit"],
  process: ["Your appointment journey", "How your visit works"],
  testimonials: ["Patient feedback", "What patients share"],
  gallery: ["Inside the dental clinic", "A closer look at the clinic"],
  team: ["Meet the dental team", "Clinicians at the practice"],
  cta: ["Plan your next visit", "Ready to request an appointment?"],
  contact: ["Contact the dental clinic", "Ways to reach the clinic"],
};

export type DentalContentHygieneResult = {
  site: Site;
  changed: boolean;
};

/**
 * Applies deterministic visitor-content safety after both scaffold creation and
 * AI enrichment. Optional evidence sections remain in the portable structure,
 * but are hidden until the draft contains renderable, business-supplied items.
 */
export function applyDentalVisitorContentHygiene(
  site: Site,
): DentalContentHygieneResult {
  if (site.domain !== "clinic" || !isDentalSubtype(site.subtype)) {
    return { site: siteSchema.parse(structuredClone(site)), changed: false };
  }

  const before = JSON.stringify(site);
  const next = structuredClone(site);
  const services = normalizeServiceInput(next.seoBlueprint.priorityTopics, {
    industry: "Dental clinic",
    subindustry: next.subtype,
  });
  const location = next.seoBlueprint.targetLocations[0]?.trim() ?? "";
  const hasTeamEvidence = next.pages.some((page) =>
    page.sections.some(
      (section) =>
        sectionFamilyFromComponentId(section.component.componentId) ===
          "team" && hasOptionalEvidence("team", section.props),
    ),
  );

  next.seoBlueprint.priorityTopics = services;
  for (const page of next.pages) {
    if (hasAuthoringInstruction(page.seo.description)) {
      page.seo.description = safePageDescription(next, page.path, services);
    }

    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(
        section.component.componentId,
      );
      if (!family) continue;

      section.props = sanitizeRecord(section.props);

      if (family === "services") {
        section.props = normalizeServicesProps(
          section.props,
          services,
          next.name,
          next.subtype,
        );
      }

      if (family === "about") {
        const description = nonEmpty(section.props.description);
        if (!description) {
          section.props.description = safeAboutDescription(
            next,
            services,
            location,
          );
        }
      }

      if (family === "hero") {
        section.props.title = safeHeroTitle(
          next.name,
          page.path,
          location,
          hasTeamEvidence,
        );
        const description = nonEmpty(section.props.description);
        const completeDescription =
          description && description.length <= 150 && !description.endsWith("…")
            ? description
            : safeHeroDescription(next, page.path, services, hasTeamEvidence);
        section.props.description = truncate(completeDescription, 150);
      }

      if (
        OPTIONAL_EVIDENCE_FAMILIES.has(family) &&
        !hasOptionalEvidence(family, section.props)
      ) {
        section.hidden = true;
        section.props = emptyOptionalProps(family, section.props);
      }
    }

    deduplicateVisibleSectionHeadings(page.sections);
  }

  const parsed = siteSchema.parse(next);
  return { site: parsed, changed: JSON.stringify(parsed) !== before };
}

/** Release-gate diagnostics used after enrichment and before editor entry. */
export function dentalVisitorContentIssues(site: Site): CompositionGateIssue[] {
  if (site.domain !== "clinic" || !isDentalSubtype(site.subtype)) return [];
  const issues: CompositionGateIssue[] = [];

  for (const page of site.pages) {
    if (hasAuthoringInstruction(page.seo.description)) {
      issues.push({
        code: "VISITOR_AUTHORING_INSTRUCTION",
        message: `${page.path} SEO description contains authoring guidance instead of visitor copy.`,
        severity: "error",
      });
    }

    for (const section of page.sections) {
      const family = sectionFamilyFromComponentId(
        section.component.componentId,
      );
      if (!family) continue;
      if (containsAuthoringInstruction(section.props)) {
        issues.push({
          code: "VISITOR_AUTHORING_INSTRUCTION",
          message: `${page.path} section ${section.id} contains authoring guidance instead of visitor copy.`,
          severity: "error",
        });
      }
      if (
        OPTIONAL_EVIDENCE_FAMILIES.has(family) &&
        !section.hidden &&
        !hasOptionalEvidence(family, section.props)
      ) {
        issues.push({
          code: "UNVERIFIED_OPTIONAL_SECTION_VISIBLE",
          message: `${page.path} ${family} section ${section.id} is visible without renderable, business-supplied evidence.`,
          severity: "error",
        });
      }
      if (family === "services") {
        issues.push(...serviceItemIssues(page.path, section));
      }
    }
  }

  return deduplicateIssues(issues);
}

/**
 * A dedicated Doctors route is truthful only when the saved site contains a
 * visible team section with at least one named or titled clinician record.
 */
export function hasVisibleDentalTeamEvidence(site: Site): boolean {
  return site.pages.some((page) =>
    page.sections.some(
      (section) =>
        !section.hidden &&
        sectionFamilyFromComponentId(section.component.componentId) ===
          "team" &&
        hasOptionalEvidence("team", section.props),
    ),
  );
}

/** Keep the generic clinic blueprint intact while making its Dental Doctors
 * page conditional on truthful clinician evidence. */
export function isRequiredPagePathForSite(site: Site, path: string): boolean {
  const isConditionalDentalDoctorsPage =
    site.domain === "clinic" &&
    isDentalSubtype(site.subtype) &&
    path.trim().toLocaleLowerCase("en-US") === "/doctors";
  return !isConditionalDentalDoctorsPage || hasVisibleDentalTeamEvidence(site);
}

export function containsAuthoringInstruction(value: unknown): boolean {
  if (typeof value === "string") return hasAuthoringInstruction(value);
  if (Array.isArray(value))
    return value.some((item) => containsAuthoringInstruction(item));
  if (!isRecord(value)) return false;
  return Object.values(value).some((item) =>
    containsAuthoringInstruction(item),
  );
}

function sanitizeRecord(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = sanitizeValue(value);
  return isRecord(sanitized) ? sanitized : {};
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return hasAuthoringInstruction(value) ? undefined : value;
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const sanitized = sanitizeValue(item);
      if (sanitized === undefined) return [];
      if (isRecord(sanitized) && !Object.keys(sanitized).length) return [];
      return [sanitized];
    });
  }
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const sanitized = sanitizeValue(item);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

function normalizeServicesProps(
  props: Record<string, unknown>,
  fallbackServices: string[],
  businessName: string,
  subtype: string | undefined,
): Record<string, unknown> {
  const inputItems = Array.isArray(props.items) ? props.items : [];
  const normalizedItems: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const item of inputItems) {
    const record = isRecord(item) ? item : {};
    const itemTitle =
      typeof item === "string" ? item : (nonEmpty(record.title) ?? "");
    const split = normalizeServiceInput(itemTitle, {
      industry: "Dental clinic",
      subindustry: subtype,
    });
    for (const service of split) {
      const key = normalizedText(service);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const existingDescription = nonEmpty(record.description);
      normalizedItems.push({
        ...record,
        title: service,
        description: isUsefulServiceDescription(existingDescription)
          ? existingDescription
          : dentalServiceDescription(service, { businessName }),
      });
    }
  }

  for (const service of fallbackServices) {
    const key = normalizedText(service);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalizedItems.push({
      title: service,
      description: dentalServiceDescription(service, { businessName }),
    });
  }

  return { ...props, items: normalizedItems };
}

function isUsefulServiceDescription(
  value: string | undefined,
): value is string {
  if (!value || value.length < 90 || hasAuthoringInstruction(value)) {
    return false;
  }
  return !/^(?:learn|explore|discover)\s+(?:about\s+)?[^.!?]+(?:\s+and)?\s+contact\b/i.test(
    value,
  );
}

function serviceItemIssues(
  path: string,
  section: SiteSection,
): CompositionGateIssue[] {
  const items = Array.isArray(section.props.items) ? section.props.items : [];
  const seen = new Set<string>();
  const issues: CompositionGateIssue[] = [];
  for (const item of items) {
    const service =
      typeof item === "string"
        ? item.trim()
        : isRecord(item)
          ? (nonEmpty(item.title) ?? "")
          : "";
    if (!service) continue;
    const split = normalizeServiceInput(service, {
      industry: "Dental clinic",
      subindustry: "dental",
    });
    if (split.length > 1) {
      issues.push({
        code: "DENTAL_SERVICES_NOT_DISTINCT",
        message: `${path} section ${section.id} combines multiple dental services in “${service}”.`,
        severity: "error",
      });
    }
    const key = normalizedText(service);
    if (seen.has(key)) {
      issues.push({
        code: "DENTAL_SERVICE_REPEATED",
        message: `${path} section ${section.id} repeats the service “${service}”.`,
        severity: "error",
      });
    }
    seen.add(key);
  }
  return issues;
}

function hasOptionalEvidence(
  family: SectionFamily,
  props: Record<string, unknown>,
): boolean {
  const items = Array.isArray(props.items) ? props.items : [];
  if (family === "gallery") {
    return items.some((item) => {
      if (!isRecord(item)) return false;
      if (nonEmpty(item.image) || nonEmpty(item.src) || nonEmpty(item.assetId))
        return true;
      return (
        isRecord(item.image) &&
        Boolean(nonEmpty(item.image.src) || nonEmpty(item.image.assetId))
      );
    });
  }
  if (family === "testimonials") {
    return items.some(
      (item) =>
        isRecord(item) &&
        Boolean(
          nonEmpty(item.quote) ||
          nonEmpty(item.body) ||
          nonEmpty(item.description) ||
          nonEmpty(item.text) ||
          nonEmpty(item.content),
        ),
    );
  }
  if (family === "team") {
    return items.some(
      (item) =>
        isRecord(item) && Boolean(nonEmpty(item.name) || nonEmpty(item.title)),
    );
  }
  return true;
}

function emptyOptionalProps(
  family: SectionFamily,
  props: Record<string, unknown>,
): Record<string, unknown> {
  const titles: Partial<Record<SectionFamily, string>> = {
    testimonials: "Patient feedback",
    gallery: "Clinic gallery",
    team: "Dental team",
  };
  return {
    title: nonEmpty(props.title) ?? nonEmpty(props.heading) ?? titles[family],
    items: [],
  };
}

/**
 * AI content can repeat a page hero title as the following section heading.
 * Keep the hero (and otherwise the first visible occurrence), then replace
 * later duplicates with concise copy that describes that section's purpose.
 */
function deduplicateVisibleSectionHeadings(sections: SiteSection[]): void {
  const entries = sections.flatMap((section) => {
    if (section.hidden) return [];
    const family = sectionFamilyFromComponentId(section.component.componentId);
    if (!family || family === "navbar" || family === "footer") return [];

    const title = nonEmpty(section.props.title);
    const heading = nonEmpty(section.props.heading);
    if (!title && !heading) return [];
    return [{ section, family, title, heading }];
  });
  const heroFirst = [
    ...entries.filter((entry) => entry.family === "hero"),
    ...entries.filter((entry) => entry.family !== "hero"),
  ];
  const seen = new Set<string>();

  for (const entry of heroFirst) {
    const keys = [entry.title, entry.heading]
      .filter((value): value is string => Boolean(value))
      .map(normalizedText);
    const isDuplicate = keys.some((key) => seen.has(key));
    if (!isDuplicate) {
      keys.forEach((key) => seen.add(key));
      continue;
    }

    const replacement = uniqueDentalSectionHeading(entry.family, seen);
    if (entry.title) entry.section.props.title = replacement;
    if (entry.heading) entry.section.props.heading = replacement;
    seen.add(normalizedText(replacement));
  }
}

function uniqueDentalSectionHeading(
  family: SectionFamily,
  seen: ReadonlySet<string>,
): string {
  const alternatives =
    DENTAL_SECTION_HEADING_ALTERNATIVES[family] ??
    (["More about your dental care"] as const);
  for (const alternative of alternatives) {
    if (!seen.has(normalizedText(alternative))) return alternative;
  }

  const base = alternatives[0] ?? "More about your dental care";
  for (let occurrence = 2; ; occurrence += 1) {
    const alternative = truncate(`${base} · ${occurrence}`, 72);
    if (!seen.has(normalizedText(alternative))) return alternative;
  }
}

function safeAboutDescription(
  site: Site,
  services: string[],
  location: string,
): string {
  const subject = services.length
    ? naturalList(services.slice(0, 3))
    : "dental services";
  return truncate(
    `Explore ${subject} from ${site.name}${location ? ` in ${location}` : ""}, then contact the clinic with questions or to request an appointment.`,
    320,
  );
}

function safePageDescription(
  site: Site,
  path: string,
  services: string[],
): string {
  if (isTeamPage(path)) {
    return truncate(
      `Contact ${site.name} for current information about clinicians, dental services and appointment requests.`,
      180,
    );
  }
  const subject = services.length
    ? naturalList(services.slice(0, 3))
    : "dental services";
  return truncate(
    `Explore ${subject} from ${site.name} and contact the clinic to request an appointment.`,
    180,
  );
}

function safeHeroDescription(
  site: Site,
  path: string,
  services: string[],
  hasTeamEvidence: boolean,
): string {
  const normalizedPath = path.trim().toLocaleLowerCase("en-US");
  const subject = services.length
    ? naturalList(services.slice(0, 2))
    : "dental services";

  if (normalizedPath === "/") {
    return `Explore ${subject} at ${site.name}, then request an appointment.`;
  }
  if (/\/(?:services?|treatments?)(?:\/|$)/.test(normalizedPath)) {
    return `Review ${subject} and request an appointment with ${site.name}.`;
  }
  if (isTeamPage(normalizedPath) && !hasTeamEvidence) {
    return `Contact ${site.name} for current information about clinicians, services and appointment requests.`;
  }
  return safePageDescription(site, path, services);
}

function safeHeroTitle(
  businessName: string,
  path: string,
  location: string,
  hasTeamEvidence: boolean,
) {
  const normalizedPath = path.trim().toLocaleLowerCase("en-US");
  if (normalizedPath === "/") {
    const cleanName = businessName.trim().replace(/\s+/g, " ");
    if (cleanName.length <= 52) return cleanName;
    return location
      ? truncate(`Dental care in ${location}`, 52)
      : "Dental care";
  }
  if (/\/(?:services?|treatments?)(?:\/|$)/.test(normalizedPath)) {
    return "Explore dental services";
  }
  if (isTeamPage(normalizedPath)) {
    return hasTeamEvidence
      ? "Meet the dental team"
      : "Ask about the dental team";
  }
  if (/\/about(?:\/|$)/.test(normalizedPath)) {
    const title = `About ${businessName.trim().replace(/\s+/g, " ")}`;
    return title.length <= 52 ? title : "About the clinic";
  }
  if (/\/(?:contact|appointment|book|enquir)(?:\/|$)/.test(normalizedPath)) {
    return "Request an appointment";
  }
  return truncate(businessName.trim().replace(/\s+/g, " "), 52);
}

function naturalList(values: string[]): string {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function isTeamPage(path: string) {
  return /\/(?:doctors?|team|people|staff)(?:\/|$)/i.test(path);
}

function hasAuthoringInstruction(value: unknown): boolean {
  return (
    typeof value === "string" &&
    AUTHORING_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(value))
  );
}

function sectionFamilyFromComponentId(
  componentId: string,
): SectionFamily | undefined {
  const normalized = componentId.toLowerCase();
  const legacy = SECTION_FAMILIES.find(
    (family) =>
      normalized === `${family}.placeholder` ||
      normalized.startsWith(`${family}.`),
  );
  if (legacy) return legacy;
  const upper = componentId.toUpperCase();
  return SECTION_FAMILIES.find((family) =>
    upper.includes(`-${FAMILY_CODES[family]}-`),
  );
}

function deduplicateIssues(
  issues: CompositionGateIssue[],
): CompositionGateIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}:${issue.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isDentalSubtype(value: unknown): boolean {
  return (
    typeof value === "string" &&
    /(?:^|[^a-z])(dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|implant(?:s|ology)?|oral[ -](?:surgery|care))(?:[^a-z]|$)/i.test(
      value,
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizedText(value: string) {
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function truncate(value: string, maximum: number) {
  if (value.length <= maximum) return value;
  const candidate = value.slice(0, maximum - 1).trimEnd();
  const lastSpace = candidate.lastIndexOf(" ");
  const completeWord =
    lastSpace >= Math.floor(maximum * 0.7)
      ? candidate.slice(0, lastSpace).trimEnd()
      : candidate;
  return `${completeWord}…`;
}
