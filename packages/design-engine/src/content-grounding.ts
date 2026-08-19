import type { Site } from "@micirql/schema";

export type GroundingFacts = {
  businessName?: string;
  industry?: string;
  subindustry?: string | null;
  location?: string | null;
  services?: string[];
  goals?: string[];
  notes?: string | null;
  people?: string[];
  credentials?: string[];
  proofClaims?: string[];
  prices?: string[];
};

export type GroundingIssue = {
  pageId: string;
  sectionId: string;
  field: string;
  reason: string;
  original: string;
  replacement: string;
};

export type GroundingReport = { site: Site; issues: GroundingIssue[]; grounded: boolean };

type RiskPattern = { re: RegExp; reason: string; allowIfFactContainsMatch?: boolean };

const RISK_PATTERNS: RiskPattern[] = [
  { re: /\b\d[\d,]*\+?\s+(?:years?|yrs?)\s+(?:of\s+)?(?:experience|practice|clinical experience)\b/i, reason: "unsupplied years of experience" },
  { re: /\b\d[\d,]*\+?\s+(?:clients?|patients?|projects?|locations?|awards?|cases?|customers?|implants?|smiles?|surgeries?|procedures?)\b/i, reason: "unsupplied numeric proof" },
  { re: /\b(?:dr\.?|doctor|prof\.?|professor)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/, reason: "unsupplied clinician or team identity", allowIfFactContainsMatch: true },
  { re: /\b(?:BDS|MDS|DDS|DMD|MBBS|MD|MS|MCh|FRCS|FDS|FICOI|MICOI|PhD)\b/i, reason: "unsupplied professional qualification", allowIfFactContainsMatch: true },
  { re: /\b(?:implantologist|orthodontist|prosthodontist|endodontist|periodontist|oral surgeon|cosmetic dentist|pediatric dentist|paediatric dentist)\b/i, reason: "unsupplied clinical specialty", allowIfFactContainsMatch: true },
  { re: /\b(?:award[- ]winning|certified|accredited|licensed|board[- ]certified|fellowship[- ]trained|no\.?\s*1|#1|best in|leading|top[- ]rated)\b/i, reason: "unsupplied credential or ranking", allowIfFactContainsMatch: true },
  { re: /\b(?:expert|experienced|renowned|highly skilled|trusted|best possible)\b/i, reason: "unsupplied expertise or trust claim", allowIfFactContainsMatch: true },
  { re: /\b(?:guaranteed|100%|zero risk|risk[- ]free|permanent results?|instant results?|pain[- ]free|painless|same[- ]day results?|lifetime guarantee)\b/i, reason: "unsupported guarantee or treatment outcome" },
  { re: /(?:₹|\$|€|£)\s?\d[\d,.]*|\b\d[\d,.]*\s*(?:INR|USD|AUD|GBP|EUR)\b|\b(?:from|starting at|starts at)\s*(?:₹|\$|€|£)?\s?\d[\d,.]*/i, reason: "unsupplied price" },
  { re: /\b(?:rated\s*)?\d(?:\.\d)?\s*\/\s*5\b|\b\d(?:\.\d)?[- ]star\b|\b\d{2,3}%\s+(?:success|satisfaction|recommend|recommended|effective|improvement)\b/i, reason: "unsupplied rating or percentage proof" },
  { re: /\b(?:clinically proven|proven results?|proven success|success rate|failure rate|complication rate)\b/i, reason: "unsupplied clinical evidence claim", allowIfFactContainsMatch: true },
];

const SAFE_REPLACEMENTS: Record<string, string> = {
  hero: "Clear information about the business and the next step for visitors.",
  services: "Explore the services available and choose what best matches your needs.",
  features: "Learn about the practical benefits and capabilities relevant to this service.",
  about: "Learn more about the business, its approach and what visitors can expect.",
  process: "See the typical steps involved and what to expect next.",
  testimonials: "Verified customer feedback can be added here when available.",
  team: "Team details can be added here when verified information is available.",
  gallery: "Real project or business photos can be added here.",
  cta: "Get in touch to discuss the next step.",
  contact: "Use the available contact options to reach the team.",
  content: "Add verified business information here.",
};

export function groundSiteContent(site: Site, facts: GroundingFacts): GroundingReport {
  const next = structuredClone(site);
  const issues: GroundingIssue[] = [];
  const factText = normalizedFactText(facts);
  for (const page of next.pages) for (const section of page.sections) {
    const family = familyFromComponentId(section.component.componentId);
    sanitizeRecord(section.props as Record<string, unknown>, page.id, section.id, family, factText, issues, "");
  }
  return { site: next, issues, grounded: issues.length === 0 };
}

function sanitizeRecord(record: Record<string, unknown>, pageId: string, sectionId: string, family: string, factText: string, issues: GroundingIssue[], prefix: string) {
  for (const [key, value] of Object.entries(record)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      const risk = risky(value, factText);
      if (!risk) continue;
      const replacement = safeReplacement(key, family, value);
      record[key] = replacement;
      issues.push({ pageId, sectionId, field, reason: risk, original: value, replacement });
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => { if (item && typeof item === "object" && !Array.isArray(item)) sanitizeRecord(item as Record<string, unknown>, pageId, sectionId, family, factText, issues, `${field}[${index}]`); });
      continue;
    }
    if (value && typeof value === "object") sanitizeRecord(value as Record<string, unknown>, pageId, sectionId, family, factText, issues, field);
  }
}

function risky(value: string, factText: string): string | null {
  for (const pattern of RISK_PATTERNS) {
    const match = pattern.re.exec(value);
    if (!match) continue;
    if (pattern.allowIfFactContainsMatch) {
      const globalFlags = pattern.re.flags.includes("g") ? pattern.re.flags : `${pattern.re.flags}g`;
      const claims = [...value.matchAll(new RegExp(pattern.re.source, globalFlags))].map((item) => normalize(item[0] ?? "")).filter(Boolean);
      if (claims.length > 0 && claims.every((claim) => factText.includes(claim))) continue;
    }
    const normalized = normalize(value);
    if (normalized && factText.includes(normalized)) continue;
    const matchedClaim = normalize(match[0] ?? "");
    if (matchedClaim && factText.includes(matchedClaim)) continue;
    return pattern.reason;
  }
  return null;
}

function safeReplacement(field: string, family: string, original: string): string {
  const lower = field.toLowerCase();
  if (lower.includes("label")) return family === "contact" ? "Contact us" : "View details";
  if (lower.includes("title") || lower.includes("heading")) {
    if (family === "testimonials") return "Customer feedback";
    if (family === "team") return "Meet the team";
    if (family === "services") return "Our services";
    return original
      .replace(/\b(?:award[- ]winning|certified|accredited|licensed|board[- ]certified|fellowship[- ]trained|no\.?\s*1|#1|best in|leading|top[- ]rated|expert|experienced|renowned|highly skilled|trusted|best possible|guaranteed|100%|pain[- ]free|painless)\b/gi, "")
      .replace(/\b\d[\d,]*\+?\s+(?:years?|yrs?)\s+(?:of\s+)?(?:experience|practice|clinical experience)\b/gi, "")
      .replace(/\s{2,}/g, " ").trim() || "Learn more";
  }
  return SAFE_REPLACEMENTS[family] ?? SAFE_REPLACEMENTS.content ?? "Add verified business information here.";
}

function normalizedFactText(facts: GroundingFacts): string {
  return normalize([
    facts.businessName, facts.industry, facts.subindustry, facts.location,
    ...(facts.services ?? []), ...(facts.goals ?? []), ...(facts.people ?? []),
    ...(facts.credentials ?? []), ...(facts.proofClaims ?? []), ...(facts.prices ?? []), facts.notes,
  ].filter(Boolean).join(" "));
}

function normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9₹$€£%./+ ]+/g, " ").replace(/\s+/g, " ").trim(); }
function familyFromComponentId(componentId: string): string {
  const value = componentId.toLowerCase();
  for (const family of ["navbar","hero","about","services","features","process","testimonials","gallery","team","cta","contact","footer"]) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string,string> = { nav:"navbar",hero:"hero",about:"about",serv:"services",feat:"features",proc:"process",test:"testimonials",gall:"gallery",team:"team",cta:"cta",cont:"contact",foot:"footer" };
  for (const [code,family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return "content";
}
