import { createWorkersAiJsonPlannerModel } from "./cloudflare-workers-ai-text";

export type InterpretedOnboardingBrief = {
  businessName: string;
  industry: string;
  subindustry: string;
  location: string;
  services: string[];
  goals: string[];
  styleTags: string[];
  requiredCapabilities: string[];
  languages: string[];
  notes: string;
  source: "cloudflare-workers-ai" | "deterministic-fallback";
};

export async function interpretOnboardingBrief(context: string): Promise<InterpretedOnboardingBrief> {
  const brief = context.trim();
  if (brief.length < 20) throw new Error("Describe your business and what you want the website to achieve.");

  const fallback = deterministicBrief(brief);
  const model = createWorkersAiJsonPlannerModel({ maxOutputTokens: 1_200 });
  if (!model) return fallback;

  try {
    const raw = await model.generate({
      system: `You extract a website project brief into strict JSON. Never invent business facts. If a fact is not stated, use an empty string or empty array. Infer only broad website intent such as industry, goals, style, and capabilities when strongly supported by the user's words. Return exactly these keys: businessName, industry, subindustry, location, services, goals, styleTags, requiredCapabilities, languages, notes. services/goals/styleTags/requiredCapabilities/languages must be arrays of short strings. Keep industry concise (examples: dental, restaurant, real estate, professional services, retail, saas, education).`,
      input: { brief },
      responseFormat: "json",
    }) as Record<string, unknown>;

    return {
      businessName: text(raw.businessName) || fallback.businessName,
      industry: text(raw.industry) || fallback.industry,
      subindustry: text(raw.subindustry) || fallback.subindustry,
      location: text(raw.location) || fallback.location,
      services: list(raw.services).length ? list(raw.services) : fallback.services,
      goals: list(raw.goals).length ? list(raw.goals) : fallback.goals,
      styleTags: list(raw.styleTags).length ? list(raw.styleTags) : fallback.styleTags,
      requiredCapabilities: list(raw.requiredCapabilities).length ? list(raw.requiredCapabilities) : fallback.requiredCapabilities,
      languages: list(raw.languages).length ? list(raw.languages) : fallback.languages,
      notes: text(raw.notes) || fallback.notes,
      source: "cloudflare-workers-ai",
    };
  } catch {
    return fallback;
  }
}

function deterministicBrief(brief: string): InterpretedOnboardingBrief {
  const lower = brief.toLowerCase();
  const industry = /dental|dentist|implant|orthodont|smile|clinic/.test(lower) ? "dental"
    : /restaurant|cafe|hotel|resort|hospitality/.test(lower) ? "restaurant"
    : /real estate|property|realtor|builder/.test(lower) ? "real estate"
    : /saas|software|platform|app|technology|tech/.test(lower) ? "saas"
    : /school|academy|education|course|training/.test(lower) ? "education"
    : /shop|store|retail|ecommerce|e-commerce/.test(lower) ? "retail"
    : /law|legal|account|consult|agency|professional service/.test(lower) ? "professional services"
    : "other";
  const goals = unique([
    ...(/book|appointment|consult/.test(lower) ? ["book appointments"] : []),
    ...(/lead|enquir|contact|call|whatsapp/.test(lower) ? ["generate leads"] : []),
    ...(/trust|credible|authority|review/.test(lower) ? ["build trust"] : []),
    ...(/seo|google|rank|search/.test(lower) ? ["rank in search"] : []),
    ...(/sell|shop|buy|checkout/.test(lower) ? ["sell online"] : []),
    ...(/portfolio|gallery|before.?after|showcase/.test(lower) ? ["show portfolio"] : []),
  ]);
  const styleTags = unique([
    ...(/premium|luxury|high.end/.test(lower) ? ["premium"] : []),
    ...(/minimal|clean/.test(lower) ? ["minimal"] : []),
    ...(/modern|contemporary/.test(lower) ? ["modern"] : []),
    ...(/corporate|professional|trust/.test(lower) ? ["professional"] : []),
    ...(/bold|strong/.test(lower) ? ["bold"] : []),
    ...(/friendly|warm|approachable/.test(lower) ? ["friendly"] : []),
    ...(/editorial|magazine/.test(lower) ? ["editorial"] : []),
  ]);
  const requiredCapabilities = unique([
    ...(/book|appointment|reserve/.test(lower) ? ["booking"] : []),
    ...(/contact|enquir|lead|call|whatsapp/.test(lower) ? ["contact form"] : []),
    ...(/gallery|portfolio|before.?after/.test(lower) ? ["gallery"] : []),
    ...(/blog|article|news/.test(lower) ? ["blog"] : []),
    ...(/payment|checkout|pay online/.test(lower) ? ["payments"] : []),
    ...(/map|location|direction/.test(lower) ? ["maps"] : []),
    ...(/multilingual|multiple languages/.test(lower) ? ["multilingual"] : []),
  ]);

  return {
    businessName: inferBusinessName(brief),
    industry,
    subindustry: "",
    location: "",
    services: inferServices(brief),
    goals: goals.length ? goals : ["generate leads"],
    styleTags: styleTags.length ? styleTags : ["professional", "modern"],
    requiredCapabilities: requiredCapabilities.length ? requiredCapabilities : ["contact form"],
    languages: ["en"],
    notes: brief,
    source: "deterministic-fallback",
  };
}

function inferBusinessName(brief: string) {
  const match = brief.match(/(?:called|named|business is|clinic is|company is)\s+["']?([^,.\n]{2,60})/i);
  return match?.[1]?.trim().replace(/["']$/, "") ?? "My Business";
}

function inferServices(brief: string) {
  const match = brief.match(/(?:services?|offer|focus(?:ed)? on|speciali[sz](?:e|ing) in)\s*(?:include|are|on|:)?\s*([^.!?\n]{3,180})/i);
  if (!match?.[1]) return [];
  return match[1].split(/,|\band\b/i).map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function list(value: unknown) { return Array.isArray(value) ? unique(value.map(text).filter(Boolean)).slice(0, 16) : []; }
function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
