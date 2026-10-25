import type { CompositionGateIssue, Site } from "@micirql/schema";

const DENTAL_ONLY_LANGUAGE =
  /(?:^|[^a-z])(?:dental|dentist(?:ry|s)?|orthodont(?:ic|ics|ist)?|endodont(?:ic|ics|ist)?|periodont(?:ic|ics|ist)?|prosthodont(?:ic|ics|ist)?|root[ -]canal|dentures?|teeth|tooth|oral[ -]surgery)(?:[^a-z]|$)/i;
const UNSUPPORTED_OUTCOME_CLAIM =
  /\b(?:guarantee(?:d|s)?\s+(?:recovery|results?|pain relief)|cures?|pain[- ]free|(?:will|can)\s+(?:heal|fix|eliminate)\b[^.!?]{0,80})/i;
const CONFIRMED_SLOT_CLAIM =
  /\b(?:book now|instant booking|guaranteed availability|(?:appointment|slot)\s+(?:is\s+)?(?:confirmed|booked))\b/i;
const DIAGNOSTIC_CLAIM =
  /\b(?:we|our (?:team|clinic|website))\s+(?:diagnose|diagnoses|will diagnose)\b/i;
const AUTHORING_INSTRUCTION =
  /\b(?:add|insert|upload|provide|replace)\b[^.!?\n]{0,120}\b(?:verified|clinic-supplied|placeholder|profile|credential|image|review|testimonial)s?\b/i;

export function applyPhysiotherapyDraftContentHygiene(site: Site): {
  site: Site;
  changed: boolean;
} {
  const next = structuredClone(site);
  let changed = false;

  for (const page of next.pages) {
    const nextSeoTitle = sanitizeText(page.seo.title, "text");
    const nextSeoDescription = sanitizeText(page.seo.description, "text");
    if (nextSeoTitle !== page.seo.title) {
      page.seo.title = nextSeoTitle;
      changed = true;
    }
    if (nextSeoDescription !== page.seo.description) {
      page.seo.description = nextSeoDescription;
      changed = true;
    }

    for (const section of page.sections) {
      const family = sectionFamily(section.component.componentId);
      if (family === "testimonials") {
        if (!section.hidden || JSON.stringify(section.props.items) !== "[]") {
          section.hidden = true;
          section.props.items = [];
          changed = true;
        }
      }
      if (family === "team" || family === "gallery") {
        const verifiedItems = Array.isArray(section.props.items)
          ? section.props.items.filter(
              (item) => isRecord(item) && item.verified === true,
            )
          : [];
        if (
          JSON.stringify(section.props.items ?? []) !==
          JSON.stringify(verifiedItems)
        ) {
          section.props.items = verifiedItems;
          changed = true;
        }
        const shouldHide = verifiedItems.length === 0;
        if (section.hidden !== shouldHide) {
          section.hidden = shouldHide;
          changed = true;
        }
      }

      const sanitized = sanitizeValue(section.props, "props");
      if (
        isRecord(sanitized) &&
        JSON.stringify(sanitized) !== JSON.stringify(section.props)
      ) {
        section.props = sanitized;
        changed = true;
      }
    }
  }
  return { site: next, changed };
}

export function physiotherapyDraftContentIssues(
  site: Site,
): CompositionGateIssue[] {
  const issues: CompositionGateIssue[] = [];
  for (const page of site.pages) {
    scanValue(page.seo, `${page.path} SEO`, issues);
    for (const section of page.sections) {
      if (section.hidden) continue;
      const family = sectionFamily(section.component.componentId);
      if (family === "testimonials") {
        issues.push({
          code: "PHYSIOTHERAPY_UNVERIFIED_EVIDENCE",
          message: `${page.path} exposes a testimonial section, which is not allowed in the physiotherapy draft pack.`,
          severity: "error",
        });
      }
      if (
        (family === "team" || family === "gallery") &&
        (!Array.isArray(section.props.items) ||
          section.props.items.some(
            (item) => !isRecord(item) || item.verified !== true,
          ))
      ) {
        issues.push({
          code: "PHYSIOTHERAPY_UNVERIFIED_EVIDENCE",
          message: `${page.path} ${family} content is visible without verified source metadata.`,
          severity: "error",
        });
      }
      scanValue(section.props, `${page.path} section ${section.id}`, issues);
    }
  }
  return deduplicate(issues);
}

function sanitizeValue(value: unknown, key: string): unknown {
  if (typeof value === "string") return sanitizeText(value, key);
  if (Array.isArray(value))
    return value.map((item) => sanitizeValue(item, key));
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([childKey, childValue]) => [
      childKey,
      sanitizeValue(childValue, childKey),
    ]),
  );
}

function sanitizeText(value: string, key: string): string {
  if (DENTAL_ONLY_LANGUAGE.test(value)) {
    return key === "label"
      ? "Explore services"
      : "Contact the clinic to ask about its physiotherapy services.";
  }
  if (CONFIRMED_SLOT_CLAIM.test(value)) {
    return key === "label"
      ? "Request appointment"
      : "Send an appointment request. The clinic will respond to confirm availability.";
  }
  if (UNSUPPORTED_OUTCOME_CLAIM.test(value) || DIAGNOSTIC_CLAIM.test(value)) {
    return "A qualified professional can discuss appropriate next steps after an assessment; outcomes are not guaranteed.";
  }
  if (AUTHORING_INSTRUCTION.test(value)) {
    return "Contact the clinic directly if you need any information confirmed.";
  }
  return value;
}

function scanValue(
  value: unknown,
  label: string,
  issues: CompositionGateIssue[],
) {
  if (typeof value === "string") {
    if (DENTAL_ONLY_LANGUAGE.test(value))
      issues.push(issue("PHYSIOTHERAPY_DENTAL_LANGUAGE", label));
    if (UNSUPPORTED_OUTCOME_CLAIM.test(value) || DIAGNOSTIC_CLAIM.test(value))
      issues.push(issue("PHYSIOTHERAPY_UNSUPPORTED_CLAIM", label));
    if (CONFIRMED_SLOT_CLAIM.test(value))
      issues.push(issue("PHYSIOTHERAPY_CONFIRMED_SLOT_CLAIM", label));
    if (AUTHORING_INSTRUCTION.test(value))
      issues.push(issue("PHYSIOTHERAPY_AUTHORING_INSTRUCTION", label));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => scanValue(item, label, issues));
    return;
  }
  if (!isRecord(value)) return;
  Object.values(value).forEach((item) => scanValue(item, label, issues));
}

function issue(code: string, label: string): CompositionGateIssue {
  return {
    code,
    message: `${label} contains content outside the physiotherapy safety contract.`,
    severity: "error",
  };
}

function sectionFamily(componentId: string): string {
  const legacy = componentId.toLowerCase().split(".")[0];
  if (legacy && legacy !== componentId.toLowerCase()) return legacy;
  const code = componentId
    .toUpperCase()
    .match(
      /-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/,
    )?.[1];
  return (
    {
      NAV: "navbar",
      HERO: "hero",
      ABOUT: "about",
      SERV: "services",
      FEAT: "features",
      PROC: "process",
      TEST: "testimonials",
      GALL: "gallery",
      TEAM: "team",
      CTA: "cta",
      CONT: "contact",
      FOOT: "footer",
    }[code ?? ""] ?? ""
  );
}

function deduplicate(issues: CompositionGateIssue[]) {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.code}:${item.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
