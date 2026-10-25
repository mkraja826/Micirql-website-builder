const DENTAL_SERVICE_PHRASES = [
  "emergency dental care",
  "preventive dentistry",
  "restorative dentistry",
  "cosmetic dentistry",
  "pediatric dentistry",
  "children's dentistry",
  "root canal treatment",
  "root canal therapy",
  "wisdom tooth removal",
  "teeth straightening",
  "teeth alignment",
  "teeth whitening",
  "dental implants",
  "dental cleaning",
  "teeth cleaning",
  "clear aligners",
  "smile makeover",
  "tooth extraction",
  "tooth extractions",
  "gum treatment",
  "emergency dentistry",
  "oral surgery",
  "root canal",
  "dental exams",
  "dental exam",
  "check-ups",
  "checkups",
  "orthodontics",
  "periodontics",
  "invisalign",
  "dentures",
  "fillings",
  "veneers",
  "bridges",
  "braces",
  "crowns",
  "hygiene",
] as const;

const DENTAL_COMPOUND_SERVICE_PHRASES = new Set([
  "crowns and bridges",
]);

type ServiceContext = {
  industry?: unknown;
  subindustry?: unknown;
};

/**
 * Normalizes service intake without inventing or rewriting business facts.
 * Explicit delimiters work for every industry. For dental briefs only, a
 * delimiter-free value is split when it consists entirely of approved dental
 * service phrases (for example "Crowns Root Canal Teeth Whitening").
 */
export function normalizeServiceInput(
  value: unknown,
  context: ServiceContext = {},
): string[] {
  const source = Array.isArray(value) ? value : [value];
  const explicitlySeparated = source.flatMap((entry) =>
    typeof entry === "string"
      ? entry
          .split(/[,;\n\r|•·]+/)
          .map(cleanService)
          .filter(Boolean)
      : [],
  );
  const dental = isDentalContext(context);
  const normalized = explicitlySeparated.flatMap((service) =>
    dental ? splitKnownDentalSequence(service) : [service],
  );
  const seen = new Set<string>();
  return normalized.filter((service) => {
    const key = service.toLocaleLowerCase("en-US");
    if (!service || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isDentalContext(context: ServiceContext) {
  return /\b(?:dental|dentist|dentistry|orthodont|oral care)\b/i.test(
    `${stringValue(context.industry)} ${stringValue(context.subindustry)}`,
  );
}

function splitKnownDentalSequence(value: string): string[] {
  if (
    DENTAL_COMPOUND_SERVICE_PHRASES.has(
      value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " "),
    )
  ) {
    return [value];
  }
  const matches = dentalServicePattern()
    .execAll(value)
    .filter(({ start, end }) => {
      const before = start > 0 ? value[start - 1] : "";
      const after = end < value.length ? value[end] : "";
      return !/[a-z0-9]/i.test(before ?? "") && !/[a-z0-9]/i.test(after ?? "");
    });
  if (matches.length < 2) return [value];

  const uncovered = [...value];
  for (const match of matches) {
    for (let index = match.start; index < match.end; index += 1) {
      uncovered[index] = " ";
    }
  }
  const residue = uncovered
    .join("")
    .replace(/\b(?:and|or)\b/gi, "")
    .replace(/[\s,;|/&+•·–—-]+/g, "");
  if (residue) return [value];
  return matches.map((match) => value.slice(match.start, match.end).trim());
}

function dentalServicePattern() {
  const expression = [...DENTAL_SERVICE_PHRASES]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegExp)
    .join("|");
  return {
    execAll(value: string) {
      const matches: Array<{ start: number; end: number }> = [];
      for (const match of value.matchAll(new RegExp(expression, "gi"))) {
        const start = match.index ?? 0;
        matches.push({ start, end: start + match[0].length });
      }
      return matches;
    },
  };
}

function cleanService(value: string) {
  return value.replace(/^[-–—*\s]+|[-–—*\s]+$/g, "").trim();
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
