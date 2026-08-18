import { createWorkersAiJsonPlannerModel } from "./cloudflare-workers-ai-text";

export type LockedBriefFacts = {
  businessName: string;
  location: string;
  addresses: string[];
  phoneNumbers: string[];
  emails: string[];
  urls: string[];
  people: string[];
  credentials: string[];
  prices: string[];
  openingHours: string[];
  claims: string[];
};

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
  lockedFacts: LockedBriefFacts;
  source: "cloudflare-workers-ai" | "deterministic-fallback";
};

export async function interpretOnboardingBrief(context: string): Promise<InterpretedOnboardingBrief> {
  const brief = context.trim();
  if (brief.length < 20) throw new Error("Describe your business and what you want the website to achieve.");

  const fallback = deterministicBrief(brief);
  const model = createWorkersAiJsonPlannerModel({ maxOutputTokens: 1_800 });
  if (!model) return fallback;

  try {
    const raw = await model.generate({
      system: `You extract a website project brief into strict JSON. Never invent, improve, normalize, or assume business facts. Facts such as business names, addresses, locations, phone numbers, emails, URLs, staff names, credentials, years of experience, awards, prices, opening hours, statistics, guarantees and factual claims may only appear when explicitly stated by the user. If not stated, use an empty string or empty array. You may infer only broad website intent such as industry, goals, style, capabilities and languages when strongly supported by the user's words. Return exactly these top-level keys: businessName, industry, subindustry, location, services, goals, styleTags, requiredCapabilities, languages, lockedFacts. services/goals/styleTags/requiredCapabilities/languages must be arrays of short strings. lockedFacts must be an object with exactly: businessName, location, addresses, phoneNumbers, emails, urls, people, credentials, prices, openingHours, claims. The array values inside lockedFacts must contain only verbatim or minimally cleaned facts explicitly present in the brief. Keep industry concise (examples: dental, restaurant, real estate, professional services, retail, saas, education).`,
      input: { brief },
      responseFormat: "json",
    }) as Record<string, unknown>;

    const lockedFacts = normalizeLockedFacts(raw.lockedFacts, fallback.lockedFacts);
    const businessName = text(raw.businessName) || lockedFacts.businessName || fallback.businessName;
    const location = text(raw.location) || lockedFacts.location || fallback.location;

    return {
      businessName,
      industry: text(raw.industry) || fallback.industry,
      subindustry: text(raw.subindustry) || fallback.subindustry,
      location,
      services: list(raw.services).length ? list(raw.services) : fallback.services,
      goals: list(raw.goals).length ? list(raw.goals) : fallback.goals,
      styleTags: list(raw.styleTags).length ? list(raw.styleTags) : fallback.styleTags,
      requiredCapabilities: list(raw.requiredCapabilities).length ? list(raw.requiredCapabilities) : fallback.requiredCapabilities,
      languages: list(raw.languages).length ? list(raw.languages) : fallback.languages,
      notes: groundingNotes(brief, lockedFacts),
      lockedFacts,
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

  const lockedFacts = deterministicLockedFacts(brief);
  return {
    businessName: lockedFacts.businessName || inferBusinessName(brief),
    industry,
    subindustry: "",
    location: lockedFacts.location,
    services: inferServices(brief),
    goals: goals.length ? goals : ["generate leads"],
    styleTags: styleTags.length ? styleTags : ["professional", "modern"],
    requiredCapabilities: requiredCapabilities.length ? requiredCapabilities : ["contact form"],
    languages: ["en"],
    notes: groundingNotes(brief, lockedFacts),
    lockedFacts,
    source: "deterministic-fallback",
  };
}

function deterministicLockedFacts(brief: string): LockedBriefFacts {
  const businessName = inferBusinessName(brief);
  const emails = unique(brief.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []);
  const urls = unique(brief.match(/https?:\/\/[^\s,;]+|\b(?:www\.)?[a-z0-9-]+\.(?:com|in|co\.in|org|net|ai|io|com\.au)(?:\/[^\s,;]*)?/gi) ?? []);
  const phoneNumbers = unique((brief.match(/(?:\+?\d[\d\s()-]{7,}\d)/g) ?? []).map((value) => value.trim()));
  const prices = unique(brief.match(/(?:₹|Rs\.?|INR|\$|USD|AUD|€|EUR|£|GBP)\s?\d[\d,.]*(?:\s?(?:per|\/)(?:month|year|visit|session|unit))?/gi) ?? []);
  const locationMatch = brief.match(/(?:in|at|located in|based in)\s+([A-Z][A-Za-z .'-]{2,60})(?=[,.\n]|\s+(?:called|named|and|with|offering|providing)\b)/);
  return {
    businessName: businessName === "My Business" ? "" : businessName,
    location: locationMatch?.[1]?.trim() ?? "",
    addresses: [],
    phoneNumbers,
    emails,
    urls,
    people: [],
    credentials: [],
    prices,
    openingHours: [],
    claims: [],
  };
}

function normalizeLockedFacts(value: unknown, fallback: LockedBriefFacts): LockedBriefFacts {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    businessName: text(raw.businessName) || fallback.businessName,
    location: text(raw.location) || fallback.location,
    addresses: mergeLists(list(raw.addresses), fallback.addresses),
    phoneNumbers: mergeLists(list(raw.phoneNumbers), fallback.phoneNumbers),
    emails: mergeLists(list(raw.emails), fallback.emails),
    urls: mergeLists(list(raw.urls), fallback.urls),
    people: mergeLists(list(raw.people), fallback.people),
    credentials: mergeLists(list(raw.credentials), fallback.credentials),
    prices: mergeLists(list(raw.prices), fallback.prices),
    openingHours: mergeLists(list(raw.openingHours), fallback.openingHours),
    claims: mergeLists(list(raw.claims), fallback.claims),
  };
}

function groundingNotes(brief: string, facts: LockedBriefFacts) {
  const lines = [
    "SOURCE BRIEF (user supplied):",
    brief,
    "",
    "LOCKED FACTS — use exactly as supplied; never invent missing values:",
    `Business name: ${facts.businessName || "not supplied"}`,
    `Location: ${facts.location || "not supplied"}`,
    `Addresses: ${facts.addresses.join(" | ") || "not supplied"}`,
    `Phone numbers: ${facts.phoneNumbers.join(" | ") || "not supplied"}`,
    `Emails: ${facts.emails.join(" | ") || "not supplied"}`,
    `URLs: ${facts.urls.join(" | ") || "not supplied"}`,
    `People/team: ${facts.people.join(" | ") || "not supplied"}`,
    `Credentials: ${facts.credentials.join(" | ") || "not supplied"}`,
    `Prices: ${facts.prices.join(" | ") || "not supplied"}`,
    `Opening hours: ${facts.openingHours.join(" | ") || "not supplied"}`,
    `Claims/statistics/guarantees: ${facts.claims.join(" | ") || "not supplied"}`,
    "Do not create fictional names, contact details, addresses, credentials, prices, hours, awards, statistics, guarantees, reviews or factual claims to fill missing content.",
  ];
  return lines.join("\n");
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
function list(value: unknown) { return Array.isArray(value) ? unique(value.map(text).filter(Boolean)).slice(0, 24) : []; }
function unique(values: string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }
function mergeLists(primary: string[], fallback: string[]) { return unique([...primary, ...fallback]).slice(0, 24); }
