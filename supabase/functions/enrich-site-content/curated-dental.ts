import { sanitizePublicBriefNotes } from "./content-safety.ts";

export type DeterministicEnrichmentIdentity = {
  mode: "curated" | "fallback";
  provider: "micirql-curated" | "deterministic";
  model: "dental-content-v2" | "business-brief-v1";
};

export type DentalBriefContext = {
  domain?: unknown;
  subtype?: unknown;
  industry?: unknown;
  subindustry?: unknown;
};

const CONTENT_KEYS = new Set([
  "eyebrow",
  "kicker",
  "title",
  "heading",
  "subtitle",
  "subheading",
  "description",
  "body",
  "label",
  "caption",
  "items",
  "faqs",
  "primaryAction",
  "secondaryAction",
  "ctaLabel",
]);

const AUTHORING_COPY =
  /\b(?:add|insert|upload|show|introduce|provide)\b[^.!?\n]{0,140}\b(?:verified|approved|clinic-owned|placeholder|names?|roles?|biograph|credentials?|reviews?|feedback|images?|media)\b|\b(?:remains intentionally unclaimed|this page should list only|once the clinic supplies|after the clinic supplies|no fabricated)\b/i;

const PLACEHOLDER_COPY =
  /^(?:[a-z]{3,4})[ -](?:hero|serv|about|proc|test|cta|cont|feat|gall|team|nav|foot)\s*\d{3}$/i;

export function deterministicIdentityForBrief(
  context: DentalBriefContext,
): DeterministicEnrichmentIdentity {
  return isDentalBriefContext(context)
    ? {
        mode: "curated",
        provider: "micirql-curated",
        model: "dental-content-v2",
      }
    : {
        mode: "fallback",
        provider: "deterministic",
        model: "business-brief-v1",
      };
}

export function hasExplicitIndustryIdentity(
  context: DentalBriefContext,
): boolean {
  return Boolean(
    identityToken(context.domain) || identityToken(context.subtype),
  );
}

export function isDentalBriefContext(context: DentalBriefContext): boolean {
  const domain = identityToken(context.domain);
  const subtype = identityToken(context.subtype);

  // A persisted subtype is authoritative whenever it is available. In
  // particular, `clinic` is a broad domain shared by dental, physiotherapy and
  // future healthcare packs; it must never be treated as a dental synonym.
  // Legacy clinic snapshots without a subtype can still use the narrow dental
  // vocabulary check below, preserving their established fallback behavior.
  if (subtype) return domain === "clinic" && isDentalIdentitySubtype(subtype);
  if (domain && domain !== "clinic") return false;

  // Older drafts and isolated tests may predate Site.domain/Site.subtype. Keep
  // their established dental fallback behavior, but require an actual dental
  // term rather than the generic word "clinic".
  return /(?:^|[^a-z])(?:dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|implant(?:s|ology)?|oral[ -](?:surgery|care))(?:[^a-z]|$)/i.test(
    `${text(context.industry)} ${text(context.subindustry)}`,
  );
}

function isDentalIdentitySubtype(value: string): boolean {
  return /(?:^|[^a-z])(?:dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|implant(?:s|ology)?|oral[ -](?:surgery|care))(?:[^a-z]|$)/i.test(
    value,
  );
}

/**
 * Preserve verified scaffold/user copy during provider outages, but remove
 * authoring instructions before it can become visitor-facing content.
 * Structural and media fields stay untouched; only known content fields are
 * sanitized.
 */
export function sanitizeExistingSectionProps(
  value: unknown,
): Record<string, unknown> {
  if (!isRecord(value)) return {};
  const result: Record<string, unknown> = { ...value };
  for (const key of CONTENT_KEYS) {
    if (!(key in value)) continue;
    const sanitized = sanitizeContentValue(value[key]);
    if (sanitized === undefined) delete result[key];
    else result[key] = sanitized;
  }
  return result;
}

/**
 * Curated dental copy treats useful existing/scaffold content as the source of
 * truth. Deterministic copy fills only weak or unsafe gaps.
 */
export function mergeCuratedDentalSectionProps(
  family: string | null,
  existingValue: unknown,
  fallbackValue: Record<string, unknown>,
): Record<string, unknown> {
  const existing = sanitizeExistingSectionProps(existingValue);
  const fallback = sanitizeExistingSectionProps(fallbackValue);
  const merged: Record<string, unknown> = { ...fallback };

  for (const key of [
    "eyebrow",
    "kicker",
    "title",
    "heading",
    "subtitle",
    "subheading",
    "description",
    "body",
    "label",
    "caption",
    "ctaLabel",
  ]) {
    if (isUsefulExistingText(key, existing[key])) merged[key] = existing[key];
  }

  for (const key of ["primaryAction", "secondaryAction"]) {
    const current = isRecord(existing[key]) ? existing[key] : null;
    const generated = isRecord(fallback[key]) ? fallback[key] : null;
    if (!current && !generated) continue;
    const next = { ...(generated ?? {}) };
    const label = publicText(current?.label);
    if (label) next.label = label;
    // The existing destination is verified application state. Never invent a
    // new destination in deterministic content.
    const href = text(current?.href);
    if (href) next.href = href;
    merged[key] = next;
  }

  if (family === "services") {
    merged.items = mergeDentalServiceItems(existing.items, fallback.items);
  } else {
    const existingItems = sanitizeItems(existing.items);
    const fallbackItems = sanitizeItems(fallback.items);
    merged.items = existingItems.length ? existingItems : fallbackItems;
  }

  return merged;
}

export function dentalServiceDescription(
  service: string,
  businessName: string,
): string {
  const label = clean(service) || "this dental service";
  const key = label.toLocaleLowerCase("en-US");

  if (/general\s+(?:dentistry|dental\s+care)/.test(key)) {
    return `${title(label)} is a broad starting point for routine examinations and common oral-health concerns. A consultation can clarify which listed service fits the reason for the visit and whether further assessment is needed.`;
  }
  if (/consult|assessment|second opinion/.test(key)) {
    return `${title(label)} creates time to discuss a concern, relevant history and possible care pathways before deciding what to do. Ask what examination or records may help the dentist assess the request.`;
  }
  if (/implant/.test(key)) {
    return "Dental implants are one option a dentist may discuss when replacing missing teeth. An assessment helps clarify bone, gum and neighbouring-tooth considerations before options are compared.";
  }
  if (/root\s*canal|endodont/.test(key)) {
    return "Root canal treatment addresses problems inside a tooth and may be considered when retaining it is clinically appropriate. The visit can establish what examination is needed and what alternatives should be discussed.";
  }
  if (/crown|bridge/.test(key)) {
    return `${title(label)} may be used to restore or replace teeth, depending on the teeth and supporting structures. A dentist can explain preparation, material and maintenance considerations after assessment.`;
  }
  if (/denture/.test(key)) {
    return "Dentures are removable tooth-replacement options that can vary in design, fit and care needs. Discuss the type of denture, adjustment period and follow-up that may be relevant after an examination.";
  }
  if (/align|orthodont|braces/.test(key)) {
    return `${title(label)} focuses on tooth alignment and bite-related goals. An orthodontic assessment can identify the records needed, possible approaches and questions to consider before treatment.`;
  }
  if (/whiten|bleach/.test(key)) {
    return `${title(label)} is a cosmetic option for changing the appearance of tooth colour. Ask about suitability, sensitivity and the differences between professionally supervised and other approaches.`;
  }
  if (/clean|hygiene|prevent|check.?up|exam/.test(key)) {
    return `${title(label)} supports routine assessment, cleaning and prevention based on an individual's oral health. The visit can help identify a suitable recall interval and any areas that need closer attention.`;
  }
  if (/child|paediatric|pediatric|kids?/.test(key)) {
    return `${title(label)} considers age-appropriate assessment, prevention and treatment discussions. Parents or carers can ask how to prepare for the visit and what information the clinic needs beforehand.`;
  }
  if (/extract|removal|oral surgery|surgical/.test(key)) {
    return `${title(label)} requires an assessment of the tooth, surrounding structures and suitable care options. The dentist can outline why removal may be considered and what aftercare questions to raise.`;
  }
  if (/gum|periodont/.test(key)) {
    return `${title(label)} relates to the assessment and care of gums and the structures supporting the teeth. Ask how gum measurements, home care and follow-up may inform the care plan.`;
  }
  if (/emergency|urgent/.test(key)) {
    return `${title(label)} begins with understanding the concern and deciding what level of dental assessment is appropriate. Contact local emergency services for a medical emergency.`;
  }

  return `${title(label)} can be discussed in terms of purpose, assessment, alternatives and follow-up before a care decision is made. Contact ${businessName} to ask what information is needed for that conversation.`;
}

function mergeDentalServiceItems(
  existingValue: unknown,
  fallbackValue: unknown,
): Array<Record<string, unknown>> {
  const existing = sanitizeItems(existingValue);
  const fallback = sanitizeItems(fallbackValue);
  const byTitle = new Map(
    existing.map((item) => [normalizedText(item.title), item]),
  );
  return fallback.map((item, index) => {
    const current =
      byTitle.get(normalizedText(item.title)) ?? existing[index] ?? {};
    const next = { ...item };
    const description = publicText(current.description);
    if (description && description.length >= 90) {
      next.description = description;
    }
    return next;
  });
}

function sanitizeItems(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((item) => {
    if (!isRecord(item)) return [];
    const sanitized = sanitizeContentValue(item);
    return isRecord(sanitized) && Object.keys(sanitized).length
      ? [sanitized]
      : [];
  });
}

function sanitizeContentValue(value: unknown): unknown {
  if (typeof value === "string") return publicText(value) || undefined;
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const sanitized = sanitizeContentValue(item);
      if (sanitized === undefined) return [];
      if (isRecord(sanitized) && !Object.keys(sanitized).length) return [];
      return [sanitized];
    });
  }
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const sanitized = sanitizeContentValue(item);
    if (sanitized !== undefined) result[key] = sanitized;
  }
  return result;
}

function isUsefulExistingText(key: string, value: unknown): boolean {
  const candidate = publicText(value);
  if (!candidate || PLACEHOLDER_COPY.test(candidate)) return false;
  if (key === "description" || key === "body") {
    return (
      candidate.length >= 40 &&
      !/^(?:learn|explore|discover)\s+(?:about\s+)?[^.!?]+(?:\s+and)?\s+contact\b/i.test(
        candidate,
      )
    );
  }
  return true;
}

function publicText(value: unknown): string {
  if (typeof value !== "string") return "";
  if (AUTHORING_COPY.test(value)) return "";
  return sanitizePublicBriefNotes(value) ?? "";
}

function normalizedText(value: unknown): string {
  return text(value).toLocaleLowerCase("en-US").replace(/\s+/g, " ");
}

function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function title(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function identityToken(value: unknown): string {
  return text(value)
    .toLocaleLowerCase("en-US")
    .replace(/[\s_]+/g, "-");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
