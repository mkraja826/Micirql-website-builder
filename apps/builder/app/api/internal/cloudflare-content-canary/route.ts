import { createWorkersAiJsonPlannerModel } from "../../../cloudflare-workers-ai-text";

export async function GET() {
  const model = createWorkersAiJsonPlannerModel({ maxOutputTokens: 500 });
  if (!model) {
    return Response.json({ ok: false, code: "WORKERS_AI_BINDING_UNAVAILABLE" }, { status: 503 });
  }

  try {
    const result = await model.generate({
      system: [
        "You write concise production website copy. Return JSON only.",
        "Use only facts supplied in the business object.",
        "Do not invent awards, ratings, years of experience, guarantees, statistics, credentials, prices, doctor names or medical outcomes.",
        "Do not describe the business, team or clinicians as expert, experienced, renowned, highly skilled, trusted, leading, best or best possible unless that exact authority claim is supplied as a business fact.",
        "Prefer neutral factual wording over unsupported promotional claims.",
      ].join("\n"),
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
