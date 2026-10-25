import type { CompositionGateIssue, Site, SiteSection } from "@micirql/schema";
import {
  FAMILY_CODES,
  SECTION_FAMILIES,
  type SectionFamily,
} from "@micirql/sections";
import { RESTAURANT_DRAFT_MEDIA_IDS } from "./restaurant-media-assets";

const VERIFIED_EVIDENCE_FAMILIES = new Set<SectionFamily>([
  "testimonials",
  "gallery",
  "team",
]);

const CLINICAL_LANGUAGE =
  /(?:^|[^a-z])(?:appointment|assessment|clinic|clinician|dental|dentist(?:ry|s)?|diagnos(?:e|is|tic)|doctor|medical|orthodont(?:ic|ics|ist)?|patient|physio(?:therapy|therapist)?|physical[ -]therap(?:y|ist)|rehabilitation|root[ -]canal|symptoms?|therap(?:y|ist)|treatments?)(?:[^a-z]|$)/i;
const CONFIRMED_RESERVATION_CLAIM =
  /\b(?:book now|reserve now|instant(?:ly)?\s+(?:booked|confirmed)|guaranteed\s+(?:booking|reservation|table)|(?:booking|reservation|table)\s+(?:is|will be|has been|now)\s+(?:booked|confirmed|reserved)|your table is (?:booked|confirmed|reserved))\b/i;
const DIRECT_RESERVATION_ACTION =
  /\b(?:book|reserve)(?:\s+(?:a|your))?\s+table\b|\b(?:book online|make a reservation)\b/i;
const LIVE_AVAILABILITY_CLAIM =
  /\b(?:live|real[- ]time|instant)\s+(?:table\s+)?availability\b|\b(?:tables?|seats?)\s+(?:are\s+)?available\s+(?:now|today|tonight)\b|\bonly\s+\d+\s+(?:tables?|seats?)\s+(?:are\s+)?left\b|\bfully booked\s+(?:now|today|tonight)\b/i;
const PRICE_CLAIM =
  /(?:₹|Rs\.?|INR|USD|AUD|CAD|SGD|\$|€|£)\s*\d|\b\d+(?:[.,]\d{1,2})?\s*(?:INR|USD|AUD|CAD|SGD|rupees?|dollars?|euros?|pounds?)\b/i;
const DIETARY_OR_ALLERGEN_CLAIM =
  /\b(?:allergen(?:s|[- ]free)?|contains?\s+(?:dairy|egg|fish|gluten|milk|nuts?|peanuts?|sesame|shellfish|soy|wheat)|dairy[- ]free|eggless|gluten[- ]free|halal|kosher|non[- ]vegetarian|nut[- ]free|organic|plant[- ]based|vegan|vegetarian)\b/i;
const HOURS_CLAIM =
  /\b(?:opening hours?|open daily|open (?:today|tonight|until|from)|closed (?:today|on)|(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?s?(?:\s*(?:-|to|through|&|,))?\s*(?:(?:mon|tue|wed|thu|fri|sat|sun)(?:day)?s?)?|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)(?:\s*(?:-|to|until)\s*\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))?)\b/i;
const STAFF_CLAIM =
  /\b(?:award[- ]winning chef|chef\s+[A-Z][\p{L}'-]+|executive chef|head chef|our chef|our founder|our host|our staff|our team|family[- ]owned|founded by)\b/iu;
const REVIEW_OR_AWARD_CLAIM =
  /\b(?:award[- ]winning|awarded|best restaurant|customer reviews?|diners? say|michelin|rated\s+\d(?:\.\d)?|\d(?:\.\d)?\s*(?:\/\s*5|stars?)|testimonials?)\b/i;
const DELIVERY_PARTNER_CLAIM =
  /\b(?:delivery partner|deliveroo|doordash|order (?:on|through|via)|swiggy|uber eats|zomato)\b/i;

const SENSITIVE_KEY =
  /(?:^|_)(?:allergen|award|calorie|chef|currency|delivery|dietary|dish|founder|hours?|ingredient|menu|nutrition|owner|people|portion|price|rating|review|serving|staff)(?:s|_|$)/i;
const HOURS_KEY = /(?:opening)?hours?|schedule/i;
const STAFF_KEY = /chef|founder|host|owner|people|staff|team|credentials?|bio/i;
const REVIEW_OR_AWARD_KEY = /award|rating|review|testimonial/i;
const DELIVERY_KEY = /delivery|orderingPartner|deliveryPartner/i;
const PRICE_KEY = /price|currency|cost/i;
const DIETARY_KEY =
  /allergen|calorie|dietary|ingredient|nutrition|organic|vegan|vegetarian/i;
const MENU_FACT_KEY =
  /dish|ingredient|menu(?:Item|Url)?|portion|serving|special(?:ity|ties)/i;

const SAFE_RESERVATION_EXPLANATION =
  "Send a reservation request. The restaurant will respond to confirm availability; submitting the form does not confirm a table.";

export type RestaurantDraftContentHygieneResult = {
  site: Site;
  changed: boolean;
};

/**
 * Removes generated restaurant facts that do not carry explicit provenance.
 * A record may establish provenance with `verified: true`. A props record may
 * instead use `verifiedFields: ["openingHours"]` when the renderer requires a
 * scalar or string-array field. Those markers must be added by trusted brief
 * ingestion, never by the content model.
 *
 * Live availability and confirmed-reservation statements are always rejected
 * from static content. They require a real-time integration and the public CTA
 * remains a reservation request until the restaurant responds.
 */
export function applyRestaurantDraftContentHygiene(
  site: Site,
): RestaurantDraftContentHygieneResult {
  const next = structuredClone(site);
  if (!isRestaurantSite(next)) return { site: next, changed: false };

  const before = JSON.stringify(next);

  next.navigation = next.navigation.map((item) => ({
    ...item,
    label: sanitizeRequiredText(item.label, "label", false) || "Restaurant",
    href: sanitizeRequiredText(item.href, "href", false) || "/",
  }));

  for (const page of next.pages) {
    page.seo.title =
      sanitizeRequiredText(page.seo.title, "seoTitle", false) ||
      `${next.name} | Restaurant`;
    page.seo.description =
      sanitizeRequiredText(page.seo.description, "seoDescription", false) ||
      `Explore verified information from ${next.name} and request a table.`;

    for (const section of page.sections) {
      const family = sectionFamily(section.component.componentId);

      if (family && VERIFIED_EVIDENCE_FAMILIES.has(family)) {
        filterVerifiedEvidence(section, family);
      }
      if (family === "services") {
        filterVerifiedMenuItems(section);
      }

      const sanitizedProps = sanitizeRecord(section.props, false);
      section.props = sanitizedProps;
      normalizeReservationBindings(section);

      if (
        (family === "services" ||
          (family && VERIFIED_EVIDENCE_FAMILIES.has(family))) &&
        (!Array.isArray(section.props.items) ||
          section.props.items.length === 0)
      ) {
        section.hidden = true;
      }
    }
  }

  return { site: next, changed: JSON.stringify(next) !== before };
}

/** Release-gate diagnostics for the unregistered Restaurant draft pack. */
export function restaurantDraftContentIssues(
  site: Site,
): CompositionGateIssue[] {
  if (!isRestaurantSite(site)) return [];
  const issues: CompositionGateIssue[] = [];

  for (const item of site.navigation) {
    scanText(item.label, "navigation label", false, issues, "label");
    scanText(item.href, "navigation href", false, issues, "href");
  }

  for (const page of site.pages) {
    scanText(page.seo.title, `${page.path} SEO title`, false, issues);
    scanText(
      page.seo.description,
      `${page.path} SEO description`,
      false,
      issues,
    );

    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = sectionFamily(section.component.componentId);

      if (family && VERIFIED_EVIDENCE_FAMILIES.has(family)) {
        const items = Array.isArray(section.props.items)
          ? section.props.items
          : [];
        if (
          items.length === 0 ||
          (!isVerifiedField(section.props, "items") &&
            items.some((item) => !isPermittedEvidenceItem(family, item)))
        ) {
          issues.push({
            code: "RESTAURANT_UNVERIFIED_EVIDENCE",
            message: `${page.path} ${family} section ${section.id} is visible without explicitly verified merchant evidence.`,
            severity: "error",
          });
        }
      }

      if (family === "services") {
        const items = Array.isArray(section.props.items)
          ? section.props.items
          : [];
        if (
          items.length === 0 ||
          (!isVerifiedField(section.props, "items") &&
            items.some((item) => !isRecord(item) || item.verified !== true))
        ) {
          issues.push({
            code: "RESTAURANT_UNVERIFIED_MENU_FACT",
            message: `${page.path} menu section ${section.id} is visible without explicitly verified menu records.`,
            severity: "error",
          });
        }
      }

      scanValue(
        section.props,
        `${page.path} section ${section.id}`,
        false,
        issues,
      );
      scanBindings(page.path, section, issues);
    }
  }

  return deduplicate(issues);
}

function filterVerifiedEvidence(
  section: SiteSection,
  family: SectionFamily,
): void {
  const items = Array.isArray(section.props.items) ? section.props.items : [];
  const verifiedItems = isVerifiedField(section.props, "items")
    ? items
    : items.filter((item) => isPermittedEvidenceItem(family, item));
  section.props.items = verifiedItems;
  section.hidden = verifiedItems.length === 0;
}

function filterVerifiedMenuItems(section: SiteSection): void {
  const items = Array.isArray(section.props.items) ? section.props.items : [];
  const verifiedItems = isVerifiedField(section.props, "items")
    ? items
    : items.filter((item) => isRecord(item) && item.verified === true);
  section.props.items = verifiedItems;
  section.hidden = verifiedItems.length === 0;
}

function sanitizeRecord(
  value: Record<string, unknown>,
  inheritedVerified: boolean,
): Record<string, unknown> {
  const recordVerified = inheritedVerified || value.verified === true;
  const verifiedFields = new Set(
    Array.isArray(value.verifiedFields)
      ? value.verifiedFields.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );
  const result: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    const fieldVerified = recordVerified || verifiedFields.has(key);
    const sanitized = sanitizeValue(item, key, fieldVerified);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

function sanitizeValue(
  value: unknown,
  key: string,
  verified: boolean,
): unknown {
  if (typeof value === "string") return sanitizeText(value, key, verified);
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const sanitized = sanitizeValue(item, key, verified);
      if (sanitized === undefined) return [];
      if (isRecord(sanitized) && !hasRenderableContent(sanitized)) return [];
      return [sanitized];
    });
  }
  if (!isRecord(value)) return value;
  const sanitized = sanitizeRecord(value, verified);
  return hasRenderableContent(sanitized) ? sanitized : undefined;
}

function sanitizeRequiredText(
  value: string,
  key: string,
  verified: boolean,
): string | undefined {
  const sanitized = sanitizeText(value, key, verified);
  return typeof sanitized === "string" ? sanitized : undefined;
}

function sanitizeText(
  value: string,
  key: string,
  verified: boolean,
): string | undefined {
  if (CLINICAL_LANGUAGE.test(value)) {
    if (/href/i.test(key)) return "/reservations";
    if (isActionKey(key) || CONFIRMED_RESERVATION_CLAIM.test(value)) {
      return "Request a table";
    }
    return undefined;
  }
  if (CONFIRMED_RESERVATION_CLAIM.test(value)) {
    return isActionKey(key) ? "Request a table" : SAFE_RESERVATION_EXPLANATION;
  }
  if (DIRECT_RESERVATION_ACTION.test(value) && isActionKey(key)) {
    return "Request a table";
  }
  if (LIVE_AVAILABILITY_CLAIM.test(value)) return undefined;
  if (!verified && sensitiveClaim(value, key)) return undefined;
  return value;
}

function sensitiveClaim(value: string, key: string): boolean {
  if (MENU_FACT_KEY.test(key)) return true;
  if (PRICE_KEY.test(key) || PRICE_CLAIM.test(value)) return true;
  if (DIETARY_KEY.test(key) || DIETARY_OR_ALLERGEN_CLAIM.test(value))
    return true;
  if (HOURS_KEY.test(key) || HOURS_CLAIM.test(value)) return true;
  if (STAFF_KEY.test(key) || STAFF_CLAIM.test(value)) return true;
  if (REVIEW_OR_AWARD_KEY.test(key) || REVIEW_OR_AWARD_CLAIM.test(value))
    return true;
  if (DELIVERY_KEY.test(key) || DELIVERY_PARTNER_CLAIM.test(value)) return true;
  return SENSITIVE_KEY.test(key);
}

function normalizeReservationBindings(section: SiteSection): void {
  for (const [key, binding] of Object.entries(section.bindings)) {
    if (
      /appointment|book|reservation/i.test(binding.actionId) &&
      binding.actionId !== "reservation.request"
    ) {
      section.bindings[key] = {
        ...binding,
        actionId: "reservation.request",
      };
    }
  }
}

function scanBindings(
  pagePath: string,
  section: SiteSection,
  issues: CompositionGateIssue[],
): void {
  for (const binding of Object.values(section.bindings)) {
    if (
      /appointment|book|reservation/i.test(binding.actionId) &&
      binding.actionId !== "reservation.request"
    ) {
      issues.push({
        code: "RESTAURANT_NON_REQUEST_BINDING",
        message: `${pagePath} section ${section.id} uses ${binding.actionId}; Restaurant reservations must remain requests.`,
        severity: "error",
      });
    }
  }
}

function scanValue(
  value: unknown,
  label: string,
  inheritedVerified: boolean,
  issues: CompositionGateIssue[],
  key = "props",
): void {
  if (typeof value === "string") {
    scanText(value, label, inheritedVerified, issues, key);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) =>
      scanValue(item, label, inheritedVerified, issues, key),
    );
    return;
  }
  if (!isRecord(value)) return;

  const recordVerified = inheritedVerified || value.verified === true;
  const verifiedFields = new Set(
    Array.isArray(value.verifiedFields)
      ? value.verifiedFields.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  );
  for (const [childKey, childValue] of Object.entries(value)) {
    scanValue(
      childValue,
      label,
      recordVerified || verifiedFields.has(childKey),
      issues,
      childKey,
    );
  }
}

function scanText(
  value: string,
  label: string,
  verified: boolean,
  issues: CompositionGateIssue[],
  key = "text",
): void {
  if (CLINICAL_LANGUAGE.test(value)) {
    issues.push(issue("RESTAURANT_CROSS_INDUSTRY_LANGUAGE", label));
  }
  if (CONFIRMED_RESERVATION_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_CONFIRMED_RESERVATION_CLAIM", label));
  }
  if (DIRECT_RESERVATION_ACTION.test(value) && isActionKey(key)) {
    issues.push(issue("RESTAURANT_DIRECT_RESERVATION_ACTION", label));
  }
  if (LIVE_AVAILABILITY_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_LIVE_AVAILABILITY_CLAIM", label));
  }
  if (verified) return;

  if (MENU_FACT_KEY.test(key)) {
    issues.push(issue("RESTAURANT_UNVERIFIED_MENU_FACT", label));
  }
  if (PRICE_KEY.test(key) || PRICE_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_UNVERIFIED_PRICE", label));
  }
  if (DIETARY_KEY.test(key) || DIETARY_OR_ALLERGEN_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_UNVERIFIED_DIETARY_CLAIM", label));
  }
  if (HOURS_KEY.test(key) || HOURS_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_UNVERIFIED_HOURS", label));
  }
  if (STAFF_KEY.test(key) || STAFF_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_UNVERIFIED_STAFF", label));
  }
  if (REVIEW_OR_AWARD_KEY.test(key) || REVIEW_OR_AWARD_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_UNVERIFIED_REVIEW_OR_AWARD", label));
  }
  if (DELIVERY_KEY.test(key) || DELIVERY_PARTNER_CLAIM.test(value)) {
    issues.push(issue("RESTAURANT_UNVERIFIED_DELIVERY_PARTNER", label));
  }
}

function issue(code: string, label: string): CompositionGateIssue {
  return {
    code,
    message: `${label} contains content outside the Restaurant draft safety contract.`,
    severity: "error",
  };
}

function sectionFamily(componentId: string): SectionFamily | undefined {
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

function isRestaurantSite(site: Site): boolean {
  return (
    site.domain === "restaurant" &&
    /(?:^|[^a-z])(?:restaurant|dining)(?:[^a-z]|$)/i.test(
      site.subtype ?? "restaurant",
    )
  );
}

function isActionKey(key: string): boolean {
  return /label|title|action|button|cta/i.test(key);
}

function isVerifiedField(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return (
    record.verified === true ||
    (Array.isArray(record.verifiedFields) &&
      record.verifiedFields.some((item) => item === key))
  );
}

function isPermittedEvidenceItem(
  family: SectionFamily,
  value: unknown,
): boolean {
  if (isRecord(value) && value.verified === true) return true;
  return family === "gallery" && isDisclosedIllustrativeGalleryItem(value);
}

/**
 * Draft visual-QA stock is not merchant evidence. It may survive only in a
 * gallery when its asset belongs to the audited Restaurant pool and both its
 * metadata and visitor-facing copy make the illustrative status explicit.
 */
function isDisclosedIllustrativeGalleryItem(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.image)) return false;
  const image = value.image;
  const assetId = text(image.assetId);
  const alt = text(image.alt).toLocaleLowerCase("en-US");
  const disclosure = text(value.description).toLocaleLowerCase("en-US");
  return (
    RESTAURANT_DRAFT_MEDIA_IDS.some((id) => id === assetId) &&
    image.license === "licensed" &&
    text(image.sourceReference).startsWith("https://www.pexels.com/") &&
    alt.includes("illustrative") &&
    alt.includes("not a verified") &&
    disclosure.includes("illustrative stock") &&
    disclosure.includes("not a verified")
  );
}

function hasRenderableContent(value: Record<string, unknown>): boolean {
  return Object.entries(value).some(
    ([key, item]) =>
      key !== "verified" &&
      key !== "verifiedFields" &&
      item !== undefined &&
      (!Array.isArray(item) || item.length > 0),
  );
}

function deduplicate(issues: CompositionGateIssue[]): CompositionGateIssue[] {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.code}:${item.message}:${item.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
