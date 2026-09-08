import { plannerModelFromEnvironment } from "@micirql/ai";

export async function GET(request: Request) {
  try {
    assertLibraryAdmin(request);
    const model = plannerModelFromEnvironment(process.env);
    if (!model) {
      return Response.json(
        { ok: false, code: "TEXT_PROVIDER_NOT_CONFIGURED", error: "Text AI is not configured in the Builder runtime." },
        { status: 503 },
      );
    }

    const result = await model.generate({
      system: 'Return exactly one JSON object: {"healthCheck":"micirql-text-provider"}.',
      input: { purpose: "deployed Builder text provider health check" },
      responseFormat: "json",
    });

    if (!result || typeof result !== "object" || Array.isArray(result) || (result as Record<string, unknown>).healthCheck !== "micirql-text-provider") {
      throw new Error("Text provider returned an unexpected health-check payload.");
    }

    return Response.json({ ok: true, provider: model.id, modelHealth: "verified" });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 500;
    return Response.json(
      {
        ok: false,
        code: "TEXT_PROVIDER_RUNTIME_HEALTH_FAILED",
        error: error instanceof Error ? error.message : "Text provider runtime health check failed.",
      },
      { status },
    );
  }
}

function assertLibraryAdmin(request: Request) {
  const expected = process.env.MICIRQL_LIBRARY_ADMIN_TOKEN;
  if (!expected) {
    const error = new Error("Dental media library admin token is not configured.") as Error & { status?: number };
    error.status = 503;
    throw error;
  }
  const provided = request.headers.get("x-micirql-library-token");
  if (!provided || provided !== expected) {
    const error = new Error("FORBIDDEN") as Error & { status?: number };
    error.status = 403;
    throw error;
  }
}
