import { NextRequest, NextResponse } from "next/server";
import { plannerModelFromEnvironment } from "@micirql/ai";
import { siteSchema } from "@micirql/schema";
import type { AiEditorOperation, AiEditorResponse } from "../../ai-edit-types";

const VARIANTS = new Set([1, 2, 3, 4, 5]);

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
            "You never write code, CSS, HTML, JavaScript, component IDs or URLs to external services.",
            "Return exactly one JSON operation.",
            "Allowed operation types:",
            "1) section.variant: {type:'section.variant', variant:1|2|3|4|5, heading?:string, body?:string, rationale:string}",
            "2) section.copy: {type:'section.copy', heading?:string, body?:string, rationale:string}",
            "3) page.add: {type:'page.add', name:string, path:string, rationale:string}",
            "Use section operations only when a selected section exists.",
            "Preserve business facts. Do not invent awards, prices, doctors, addresses, statistics, reviews or claims.",
            "If the user asks for another layout/hero/design, choose section.variant.",
            "If the user asks to rewrite/tighten copy, choose section.copy.",
            "If the user asks to add/create a page, choose page.add.",
          ].join("\n"),
          input: {
            prompt,
            site: { name: site.name, domain: site.domain, theme: site.theme },
            page: { id: page.id, name: page.name, path: page.path },
            selectedSection: section ? { id: section.id, componentId: section.component.componentId, props: section.props } : null,
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
    if (!operation) return NextResponse.json({ error: section ? "This edit needs the configured AI model, or ask for another layout/new page." : "Select a section or ask MiCirql to add a page." }, { status: 422 });
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
  if (type === "page.add") {
    const name = optionalText(obj.name);
    if (!name) return null;
    return { type, name, path: normalizePath(optionalText(obj.path) ?? name), rationale };
  }
  return null;
}

function deterministicOperation(prompt: string, hasSection: boolean): AiEditorOperation | null {
  const lower = prompt.toLowerCase();
  if (/\b(add|create|make)\b.*\bpage\b/.test(lower)) {
    const pageName = prompt.match(/(?:add|create|make)\s+(?:an?\s+)?([^,.]+?)\s+page/i)?.[1]?.trim() || "New";
    return { type: "page.add", name: titleCase(pageName), path: normalizePath(pageName), rationale: "Added a page from your editor request." };
  }
  if (hasSection && /(another|different|layout|variant|design|premium|bolder|minimal|editorial|cinematic)/i.test(prompt)) {
    const variant = /cinematic|immersive|bold/i.test(prompt) ? 5 : /editorial/i.test(prompt) ? 4 : /center/i.test(prompt) ? 3 : /split/i.test(prompt) ? 2 : 2;
    return { type: "section.variant", variant, rationale: "Changed the selected section to a different library composition." };
  }
  return null;
}

function normalizePath(value: string) {
  const slug = value.trim().toLowerCase().replace(/^\/+/, "").replace(/\bpage\b/g, "").trim().replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");
  return `/${slug || "page"}`;
}
function titleCase(value: string) { return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).trim(); }
function text(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const result = text(value); return result || undefined; }
