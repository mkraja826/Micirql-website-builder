import { getCloudflareContext } from "@opennextjs/cloudflare";

const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

type Classification = {
  category: "team" | "results" | "clinic" | "service" | "certificate" | "product" | "general";
  alt: string;
  tags: string[];
  sectionFamilies: string[];
  source: "cloudflare-workers-ai-vision" | "deterministic-fallback";
};

type AiBinding = { run(model: string, input: Record<string, unknown>): Promise<unknown> };

export async function classifyUploadedBusinessAsset(dataUrl: string, fileName: string): Promise<Classification> {
  const fallback = deterministic(fileName);
  const ai = binding();
  if (!ai) return fallback;
  try {
    const raw = await ai.run(VISION_MODEL, {
      messages: [
        { role: "system", content: "Classify business website imagery. Do not identify a real person or infer credentials, medical outcomes, ownership, awards, or facts not visually evident. Return JSON only." },
        { role: "user", content: `Classify this image for website placement. Return keys category, alt, tags, sectionFamilies. category must be one of team, results, clinic, service, certificate, product, general. sectionFamilies may only contain hero, services, features, process, testimonials, gallery, team, about, cta, contact. Filename: ${fileName}` },
      ],
      image: dataUrl,
      max_tokens: 500,
    }) as any;
    const parsed = parsePayload(raw);
    const category = allowedCategory(parsed.category) ? parsed.category : fallback.category;
    const tags = unique(["upload", "user-owned", "verified-customer-asset", category, ...stringList(parsed.tags)]).slice(0, 16);
    const sectionFamilies = stringList(parsed.sectionFamilies).filter(allowedFamily).slice(0, 5);
    return {
      category,
      alt: safeAlt(parsed.alt, fallback.alt),
      tags,
      sectionFamilies: sectionFamilies.length ? sectionFamilies : familiesFor(category),
      source: "cloudflare-workers-ai-vision",
    };
  } catch (error) {
    console.error("MiCirql uploaded asset vision classification failed; using deterministic fallback.", error);
    return fallback;
  }
}

function binding(): AiBinding | null {
  try {
    const context = getCloudflareContext();
    const ai = (context.env as unknown as Record<string, unknown>).AI;
    return ai && typeof (ai as any).run === "function" ? ai as AiBinding : null;
  } catch { return null; }
}

function parsePayload(raw: any): Record<string, unknown> {
  if (raw && typeof raw === "object" && raw.response && typeof raw.response === "object") return raw.response;
  const value = typeof raw?.response === "string" ? raw.response : typeof raw?.result?.response === "string" ? raw.result.response : typeof raw === "string" ? raw : "";
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned) as Record<string, unknown>; } catch { return {}; }
}

function deterministic(fileName: string): Classification {
  const name = fileName.toLowerCase();
  const category: Classification["category"] = /doctor|dentist|team|staff|founder|portrait|headshot/.test(name) ? "team"
    : /before|after|result|case|smile|portfolio/.test(name) ? "results"
    : /clinic|office|interior|reception|room|facility/.test(name) ? "clinic"
    : /certificate|award|license|credential/.test(name) ? "certificate"
    : /product|pack|item|menu/.test(name) ? "product"
    : /service|treatment|implant|aligner|procedure/.test(name) ? "service"
    : "general";
  return { category, alt: readableName(fileName), tags: ["upload", "user-owned", "verified-customer-asset", category], sectionFamilies: familiesFor(category), source: "deterministic-fallback" };
}

function familiesFor(category: Classification["category"]): string[] {
  if (category === "team") return ["team", "about"];
  if (category === "results") return ["gallery"];
  if (category === "clinic") return ["about", "hero", "contact"];
  if (category === "service") return ["services", "process", "hero"];
  if (category === "certificate") return ["features", "about"];
  if (category === "product") return ["services", "gallery", "hero"];
  return ["hero", "about"];
}
function allowedCategory(value: unknown): value is Classification["category"] { return typeof value === "string" && ["team","results","clinic","service","certificate","product","general"].includes(value); }
function allowedFamily(value: string) { return ["hero","services","features","process","testimonials","gallery","team","about","cta","contact"].includes(value); }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : []; }
function unique(values: string[]) { return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))]; }
function safeAlt(value: unknown, fallback: string) { const text = typeof value === "string" ? value.trim() : ""; return (text || fallback).slice(0, 180); }
function readableName(value: string) { return value.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 180) || "Business image"; }
