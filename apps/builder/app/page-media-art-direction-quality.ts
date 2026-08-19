import type { Site } from "@micirql/schema";

export type MediaArtDirectionIssue = {
  code:
    | "MEDIA_STYLE_FRAGMENTED"
    | "MEDIA_TEMPERATURE_FRAGMENTED"
    | "MEDIA_LIGHTING_FRAGMENTED"
    | "MEDIA_NO_DOMINANT_DIRECTION";
  severity: "warning" | "error";
  detail: string;
};

export type MediaArtDirectionResult = {
  score: number;
  issues: MediaArtDirectionIssue[];
  dominant: { style?: string; temperature?: string; lighting?: string };
  samples: number;
};

export type MediaArtDirectionSignature = { style?: string; temperature?: string; lighting?: string };

/**
 * Site-level art-direction QA. This intentionally scores the selected media set
 * as a collection. Section-role diversity is allowed; contradictory lighting,
 * temperature and photography families are not.
 */
export function evaluatePageMediaArtDirection(site: Site, path = "/"): MediaArtDirectionResult {
  const page = site.pages.find((candidate) => candidate.path === path) ?? site.pages[0];
  if (!page) return { score: 100, issues: [], dominant: {}, samples: 0 };

  const signatures: MediaArtDirectionSignature[] = [];
  for (const section of page.sections) {
    const props = section.props as Record<string, unknown>;
    const image = props.image;
    if (!image || typeof image !== "object" || Array.isArray(image)) continue;
    const intent = props.mediaSelectionIntent;
    const tokens: string[] = [];
    if (intent && typeof intent === "object" && !Array.isArray(intent)) {
      const record = intent as Record<string, unknown>;
      if (Array.isArray(record.selectedAssetTags)) tokens.push(...record.selectedAssetTags.filter((value): value is string => typeof value === "string"));
      if (Array.isArray(record.preferredTags)) tokens.push(...record.preferredTags.filter((value): value is string => typeof value === "string"));
      if (typeof record.reason === "string") tokens.push(record.reason);
    }
    const signature = classifyMediaArtDirectionTokens(tokens.join(" "));
    if (signature.style || signature.temperature || signature.lighting) signatures.push(signature);
  }

  if (signatures.length < 3) return { score: 100, issues: [], dominant: {}, samples: signatures.length };

  const style = distribution(signatures.map((item) => item.style));
  const temperature = distribution(signatures.map((item) => item.temperature));
  const lighting = distribution(signatures.map((item) => item.lighting));
  const issues: MediaArtDirectionIssue[] = [];
  let score = 100;

  score -= fragmentationPenalty(style, "MEDIA_STYLE_FRAGMENTED", "photography style", issues);
  score -= fragmentationPenalty(temperature, "MEDIA_TEMPERATURE_FRAGMENTED", "colour temperature", issues);
  score -= fragmentationPenalty(lighting, "MEDIA_LIGHTING_FRAGMENTED", "lighting family", issues);

  const strongest = Math.max(style.ratio, temperature.ratio, lighting.ratio);
  if (signatures.length >= 4 && strongest < 0.5) {
    issues.push({ code: "MEDIA_NO_DOMINANT_DIRECTION", severity: "error", detail: "No visual family dominates the selected page media." });
    score -= 22;
  }

  return {
    score: Math.max(0, Math.round(score)),
    issues,
    dominant: { style: style.value, temperature: temperature.value, lighting: lighting.value },
    samples: signatures.length,
  };
}

export function classifyMediaArtDirectionTokens(text: string): MediaArtDirectionSignature {
  const normalized = text.toLowerCase();
  return {
    style: first(normalized, [
      ["editorial", /editorial|campaign|luxury|atelier|cinematic|fashion/],
      ["clinical", /clinical|precision|medical|sterile|technology|scanner|technical/],
      ["documentary", /documentary|candid|consultation|planning|over-shoulder|natural/],
      ["studio", /studio|portrait|posed|headshot/],
    ]),
    temperature: first(normalized, [
      ["warm", /warm|cream|beige|gold|amber|sunlit|earth/],
      ["cool", /cool|blue|cyan|steel|silver|crisp-white|crisp white/],
      ["neutral", /neutral|white|minimal|restrained|clean/],
    ]),
    lighting: first(normalized, [
      ["high-key", /high-key|high key|bright|airy|soft-light|soft light/],
      ["low-key", /low-key|low key|moody|dramatic|shadow|dark/],
      ["natural", /natural-light|natural light|daylight|window light|documentary/],
    ]),
  };
}

function first(text: string, rules: Array<[string, RegExp]>): string | undefined {
  return rules.find(([, pattern]) => pattern.test(text))?.[0];
}

function distribution(values: Array<string | undefined>) {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  const total = [...counts.values()].reduce((sum, value) => sum + value, 0);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { value: sorted[0]?.[0], ratio: total ? (sorted[0]?.[1] ?? 0) / total : 1, distinct: counts.size, total };
}

function fragmentationPenalty(
  value: ReturnType<typeof distribution>,
  code: MediaArtDirectionIssue["code"],
  label: string,
  issues: MediaArtDirectionIssue[],
): number {
  if (value.total < 3 || value.distinct <= 1) return 0;
  if (value.ratio >= 0.67) {
    if (value.distinct >= 3) issues.push({ code, severity: "warning", detail: `${label} has ${value.distinct} families, but ${value.value} remains dominant.` });
    return value.distinct >= 3 ? 5 : 0;
  }
  const severity = value.ratio < 0.5 ? "error" : "warning";
  issues.push({ code, severity, detail: `${label} is fragmented across ${value.distinct} families; strongest is only ${Math.round(value.ratio * 100)}%.` });
  return severity === "error" ? 18 : 10;
}
