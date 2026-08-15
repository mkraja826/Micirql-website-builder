import { NextRequest, NextResponse } from "next/server";
import { plannerModelFromEnvironment } from "@micirql/ai";
import { siteSchema } from "@micirql/schema";
import type { AiEditorOperation, AiEditorResponse, AiEditorSectionFamily } from "../../ai-edit-types";

const VARIANTS = new Set([1, 2, 3, 4, 5]);
const ADDABLE_FAMILIES = new Set<AiEditorSectionFamily>(["about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact"]);
const MOVE_DIRECTIONS = new Set(["up", "down", "top", "bottom"]);

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    await verifyUser(auth);

    const body = await request.json() as Record<string, unknown>;
    const prompt = text(body.prompt);
    if (!prompt) return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    const site = siteSchema.parse(body.site);
    const pageId = text(body.pageId);
    const sectionId = optionalText(body.sectionId);
    const page = site.pages.find((item) => item.id === pageId) ?? site.pages[0];
    if (!page) return NextResponse.json({ error: "Active page could not be resolved." }, { status: 400 });
    const section = sectionId ? page.sections.find((item) => item.id === sectionId) : undefined;

    const model = plannerModelFromEnvironment(process.env);
    if (model) {
      try {
        const raw = await model.generate({
          system: [
            "You are MiCirql's safe visual editor command interpreter.",
            "Never write code, CSS, HTML, JavaScript, component IDs, SQL, secrets, or external-service URLs.",
            "Return exactly one JSON operation and nothing else.",
            "Allowed operations:",
            "section.variant {type:'section.variant',variant:1|2|3|4|5,heading?:string,body?:string,rationale:string}",
            "section.copy {type:'section.copy',heading?:string,body?:string,rationale:string}",
            "section.add {type:'section.add',family:'about'|'services'|'features'|'process'|'testimonials'|'gallery'|'team'|'cta'|'contact',position:'after-selected'|'end',rationale:string}",
            "section.visibility {type:'section.visibility',hidden:boolean,rationale:string}",
            "section.remove {type:'section.remove',rationale:string}",
            "section.move {type:'section.move',direction:'up'|'down'|'top'|'bottom',rationale:string}",
            "media.open {type:'media.open',rationale:string}",
            "functions.open {type:'functions.open',rationale:string}",
            "seo.patch {type:'seo.patch',title?:string,description?:string,rationale:string}",
            "page.add {type:'page.add',name:string,path:string,rationale:string}",
            "Use selected-section operations only if a section is selected.",
            "section.remove is destructive; propose it only when the user explicitly asks to remove/delete a section.",
            "media.open means open MiCirql's media picker; never invent an image URL.",
            "functions.open means open the function/action connector for the selected section; never invent credentials or integrations.",
            "Preserve all business facts. Never invent awards, prices, doctors, addresses, statistics, reviews, certifications, availability or claims.",
            "SEO wording may be improved, but must stay faithful to supplied business information.",
            "Use the supplied preference profile only as a visual preference signal, never as business facts.",
          ].join("\n"),
          input: {
            prompt,
            site: { name: site.name, domain: site.domain, theme: site.theme, seoBlueprint: site.seoBlueprint },
            page: { id: page.id, name: page.name, path: page.path, seo: page.seo, sectionCount: page.sections.length },
            selectedSection: section ? { id: section.id, componentId: section.component.componentId, props: section.props, hidden: section.hidden } : null,
            preferenceProfile: body.preferenceProfile ?? null,
          },
          responseFormat: "json",
        });
        const operation = normalizeOperation(raw, Boolean(section));
        if (operation) {
          const response: AiEditorResponse = { operation, source: "ai", model: model.id };
          return NextResponse.json(response);
        }
      } catch (error) {
        console.error("AI editor model failed; using deterministic interpreter.", error);
      }
    }

    const operation = deterministicOperation(prompt, Boolean(section));
    if (!operation) return NextResponse.json({ error: section ? "This request needs the configured AI model, or ask for a supported editor action." : "Select a section or ask MiCirql to add a page/section or improve SEO." }, { status: 422 });
    const response: AiEditorResponse = { operation, source: "deterministic" };
    return NextResponse.json(response);
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI edit failed." }, { status });
  }
}

async function verifyUser(authorization: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization }, cache: "no-store" });
  if (!response.ok) {
    const error = new Error("AUTH_REQUIRED") as Error & { status?: number };
    error.status = 401;
    throw error;
  }
}

function normalizeOperation(raw: unknown, hasSection: boolean): AiEditorOperation | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    let cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
    try { value = JSON.parse(cleaned); } catch { return null; }
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const type = text(obj.type);
  const rationale = text(obj.rationale) || "Structured MiCirql edit";

  if (type === "section.variant" && hasSection) {
    const variant = Number(obj.variant);
    if (!VARIANTS.has(variant)) return null;
    const heading = optionalText(obj.heading);
    const body = optionalText(obj.body);
    return { type, variant: variant as 1|2|3|4|5, ...(heading ? { heading } : {}), ...(body ? { body } : {}), rationale };
  }
  if (type === "section.copy" && hasSection) {
    const heading = optionalText(obj.heading);
    const body = optionalText(obj.body);
    if (!heading && !body) return null;
    return { type, ...(heading ? { heading } : {}), ...(body ? { body } : {}), rationale };
  }
  if (type === "section.add") {
    const family = text(obj.family) as AiEditorSectionFamily;
    if (!ADDABLE_FAMILIES.has(family)) return null;
    const position = text(obj.position) === "after-selected" && hasSection ? "after-selected" : "end";
    return { type, family, position, rationale };
  }
  if (type === "section.visibility" && hasSection && typeof obj.hidden === "boolean") return { type, hidden: obj.hidden, rationale };
  if (type === "section.remove" && hasSection) return { type, rationale };
  if (type === "section.move" && hasSection) {
    const direction = text(obj.direction);
    if (!MOVE_DIRECTIONS.has(direction)) return null;
    return { type, direction: direction as "up"|"down"|"top"|"bottom", rationale };
  }
  if (type === "media.open" && hasSection) return { type, rationale };
  if (type === "functions.open" && hasSection) return { type, rationale };
  if (type === "seo.patch") {
    const title = optionalText(obj.title);
    const description = optionalText(obj.description);
    if (!title && !description) return null;
    return { type, ...(title ? { title: title.slice(0, 70) } : {}), ...(description ? { description: description.slice(0, 180) } : {}), rationale };
  }
  if (type === "page.add") {
    const name = optionalText(obj.name);
    if (!name) return null;
    return { type, name: name.slice(0, 80), path: normalizePath(optionalText(obj.path) ?? name), rationale };
  }
  return null;
}

function deterministicOperation(prompt: string, hasSection: boolean): AiEditorOperation | null {
  const lower = prompt.toLowerCase();
  if (/\b(add|create|make)\b.*\bpage\b/.test(lower)) {
    const pageName = prompt.match(/(?:add|create|make)\s+(?:an?\s+)?([^,.]+?)\s+page/i)?.[1]?.trim() || "New";
    return { type: "page.add", name: titleCase(pageName), path: normalizePath(pageName), rationale: "Added a page from your editor request." };
  }
  const family = detectFamily(lower);
  if (/\b(add|insert|create)\b.*\b(section|block|area)\b/.test(lower) && family) {
    return { type: "section.add", family, position: hasSection ? "after-selected" : "end", rationale: `Added a ${family} section from the approved MiCirql library.` };
  }
  if (hasSection && /\b(delete|remove)\b.*\b(section|block|this)\b/.test(lower)) return { type: "section.remove", rationale: "Remove the selected section." };
  if (hasSection && /\b(hide)\b/.test(lower)) return { type: "section.visibility", hidden: true, rationale: "Hide the selected section without deleting it." };
  if (hasSection && /\b(show|unhide|restore)\b/.test(lower)) return { type: "section.visibility", hidden: false, rationale: "Show the selected section." };
  if (hasSection && /(move|reorder).*(top|first)/i.test(prompt)) return { type: "section.move", direction: "top", rationale: "Move the selected section to the top of the page." };
  if (hasSection && /(move|reorder).*(bottom|last)/i.test(prompt)) return { type: "section.move", direction: "bottom", rationale: "Move the selected section to the bottom of the page." };
  if (hasSection && /(move|reorder).*(up|above)/i.test(prompt)) return { type: "section.move", direction: "up", rationale: "Move the selected section one position up." };
  if (hasSection && /(move|reorder).*(down|below)/i.test(prompt)) return { type: "section.move", direction: "down", rationale: "Move the selected section one position down." };
  if (hasSection && /(change|replace|choose|pick|update).*(image|photo|media)/i.test(prompt)) return { type: "media.open", rationale: "Open the media picker for the selected section." };
  if (hasSection && /(connect|add|configure).*(form|booking|action|function|button)/i.test(prompt)) return { type: "functions.open", rationale: "Open function wiring for the selected section." };
  if (hasSection && /(another|different|layout|variant|design|premium|bolder|minimal|editorial|cinematic)/i.test(prompt)) {
    const variant = /cinematic|immersive|bold/i.test(prompt) ? 5 : /editorial/i.test(prompt) ? 4 : /center/i.test(prompt) ? 3 : /split/i.test(prompt) ? 2 : 2;
    return { type: "section.variant", variant, rationale: "Changed the selected section to a different library composition." };
  }
  return null;
}

function detectFamily(value: string): AiEditorSectionFamily | undefined {
  const aliases: Array<[RegExp, AiEditorSectionFamily]> = [
    [/\babout\b/, "about"], [/\bservices?\b|treatments?/, "services"], [/\bfeatures?\b|benefits?/, "features"],
    [/\bprocess\b|steps?/, "process"], [/\btestimonials?\b|reviews?/, "testimonials"], [/\bgallery\b|portfolio/, "gallery"],
    [/\bteam\b|doctors?|staff/, "team"], [/\bcta\b|call.to.action|conversion/, "cta"], [/\bcontact\b|enquiry|inquiry/, "contact"],
  ];
  return aliases.find(([pattern]) => pattern.test(value))?.[1];
}
function normalizePath(value: string) {
  const slug = value.trim().toLowerCase().replace(/^\/+/, "").replace(/\bpage\b/g, "").trim().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  return `/${slug || "page"}`;
}
function titleCase(value: string) { return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).trim(); }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const result = text(value); return result || undefined; }
