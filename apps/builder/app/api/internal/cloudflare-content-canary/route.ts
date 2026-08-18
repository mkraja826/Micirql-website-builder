import { createWorkersAiJsonPlannerModel } from "../../../cloudflare-workers-ai-text";

export async function GET() {
  const model = createWorkersAiJsonPlannerModel({ maxOutputTokens: 500 });
  if (!model) {
    return Response.json({ ok: false, code: "WORKERS_AI_BINDING_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const result = await model.generate({
      system: "You write concise production website copy. Return JSON only. Do not invent awards, ratings, years of experience, guarantees, statistics, credentials, prices, doctor names or medical outcomes.",
      input: {
        business: {
          name: "Nova Dental Studio",
          location: "Hyderabad",
          services: ["dental implants", "crowns", "root canal treatment"],
          goal: "build trust and book consultations",
        },
        output: {
          hero: { h1: "<=12 words", p: "<=35 words", cta: "2-4 words" },
          services: { h2: "<=10 words", h3: "<=10 words", p: "<=35 words" },
        },
      },
      responseFormat: "json",
    });

    return Response.json({ ok: true, result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json(
      { ok: false, code: "WORKERS_AI_INFERENCE_FAILED", error: error instanceof Error ? error.message : "Unknown inference failure" },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
