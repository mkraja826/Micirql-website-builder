import {
  hasExplicitIndustryIdentity,
  isDentalBriefContext,
  type DentalBriefContext,
} from "./curated-dental.ts";

export type IndustryContentContext = DentalBriefContext & {
  industry?: unknown;
  subindustry?: unknown;
};

const DENTAL_IMAGE_SUBJECT =
  "an authentic, unoccupied dental clinic environment or relevant equipment detail; no identifiable clinicians or patients, no simulated treatment, no outcome claims";
const PHYSIOTHERAPY_IMAGE_SUBJECT =
  "an authentic physiotherapy clinic, assessment space, accessibility detail or guided movement scene; no visible location signage, no implied clinic employee identity, no before-and-after treatment, no outcome claims";

const DENTAL_ONLY_LANGUAGE =
  /(?:^|[^a-z])(?:dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|root[ -]canal|dentures?|teeth|tooth|oral[ -]surgery)(?:[^a-z]|$)/i;

/**
 * Deterministic image briefs are policy output, not model output. The generic
 * clinic domain deliberately does not select dental photography.
 */
export function fallbackImageSubjectForBrief(
  context: IndustryContentContext,
): string {
  if (isDentalBriefContext(context)) return DENTAL_IMAGE_SUBJECT;
  if (isPhysiotherapyBriefContext(context)) {
    return PHYSIOTHERAPY_IMAGE_SUBJECT;
  }
  const industry = text(context.industry) || "business";
  return `an authentic ${industry} environment or relevant detail; do not invent identifiable staff, customers, reviews, products, credentials, or outcomes`;
}

/**
 * The broad clinic domain can share appointment language, but only an
 * explicitly dental site receives the dental-specific "treatments" label.
 */
export function secondaryExploreActionLabel(
  context: IndustryContentContext,
): string {
  const classification = `${text(context.industry)} ${text(context.subindustry)}`;
  if (/restaurant|hospitality|dining/i.test(classification))
    return "View the menu";
  if (/real estate|property/i.test(classification)) return "Explore properties";
  if (/construction|contractor/i.test(classification)) return "View projects";
  if (isDentalBriefContext(context)) return "Explore treatments";
  if (isPhysiotherapyBriefContext(context)) return "Explore therapies";
  return "Explore services";
}

export function isPhysiotherapyBriefContext(
  context: IndustryContentContext,
): boolean {
  const persistedSubtype = text(context.subtype);
  if (persistedSubtype) {
    return /(?:^|[^a-z])(?:physio(?:therapy|therapist)?|physical[ -]therap(?:y|ist))(?:[^a-z]|$)/i.test(
      persistedSubtype,
    );
  }
  const classification = `${text(context.industry)} ${text(context.subindustry)}`;
  return /(?:^|[^a-z])(?:physio(?:therapy|therapist)?|physical[ -]therap(?:y|ist))(?:[^a-z]|$)/i.test(
    classification,
  );
}

export function isRestaurantBriefContext(
  context: IndustryContentContext,
): boolean {
  const persistedSubtype = text(context.subtype);
  if (persistedSubtype) {
    return /(?:^|[^a-z])(?:restaurant|dining(?: room)?|eatery|bistro|brasserie|fine[ -]dining|casual[ -]dining)(?:[^a-z]|$)/i.test(
      persistedSubtype,
    );
  }
  const classification = `${text(context.industry)} ${text(context.subindustry)}`;
  return /(?:^|[^a-z])(?:restaurant|dining(?: room)?|eatery|bistro|brasserie|fine[ -]dining|casual[ -]dining)(?:[^a-z]|$)/i.test(
    classification,
  );
}

/**
 * Provider output is untrusted. When a persisted, explicitly non-dental site
 * receives dental-only wording, the caller must keep its deterministic copy.
 * We intentionally omit broad healthcare terms such as clinic, treatment,
 * appointment and implant because they are not dental-exclusive.
 */
export function hasIncompatibleDentalLanguage(
  context: IndustryContentContext,
  value: unknown,
): boolean {
  return (
    hasExplicitIndustryIdentity(context) &&
    !isDentalBriefContext(context) &&
    containsDentalOnlyLanguage(value)
  );
}

function containsDentalOnlyLanguage(value: unknown): boolean {
  if (typeof value === "string") return DENTAL_ONLY_LANGUAGE.test(value);
  if (Array.isArray(value)) return value.some(containsDentalOnlyLanguage);
  if (!isRecord(value)) return false;
  return Object.values(value).some(containsDentalOnlyLanguage);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
