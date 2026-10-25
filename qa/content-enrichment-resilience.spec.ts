import { expect, test } from "@playwright/test";
import { sanitizePublicBriefNotes } from "../supabase/functions/enrich-site-content/content-safety";
import {
  GatewayRequestError,
  gatewayFailureFromResponse,
  runBoundedWithRetry,
} from "../supabase/functions/enrich-site-content/resilience";

test.describe("content enrichment resilience", () => {
  test("bounds page fan-out, retries one transient failure, and preserves partial success", async () => {
    const pages = ["home", "services", "about", "contact", "doctors"];
    const attempts = new Map<string, number>();
    let active = 0;
    let maximumActive = 0;

    const results = await runBoundedWithRetry(
      pages,
      async (page, _index, { attempt }) => {
        attempts.set(page, (attempts.get(page) ?? 0) + 1);
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        try {
          await new Promise((resolve) => setTimeout(resolve, 5));
          if (page === "services" && attempt === 1) {
            throw new GatewayRequestError({
              code: "provider_http_503",
              category: "transient",
              retryable: true,
              status: 503,
            });
          }
          if (page === "doctors") {
            throw new GatewayRequestError({
              code: "nvidia_not_configured",
              category: "configuration",
              retryable: false,
              status: 503,
            });
          }
          return `${page}-content`;
        } finally {
          active -= 1;
        }
      },
      {
        concurrency: 3,
        maxAttempts: 2,
        timeoutMs: 1_000,
        delayMs: 0,
      },
    );

    expect(maximumActive).toBe(3);
    expect(attempts.get("services")).toBe(2);
    expect(attempts.get("doctors")).toBe(1);
    expect(
      results.map((result) => (result.ok ? result.value : "fallback")),
    ).toEqual([
      "home-content",
      "services-content",
      "about-content",
      "contact-content",
      "fallback",
    ]);
    expect(results[1]).toMatchObject({ ok: true, attempts: 2 });
    expect(results[4]).toMatchObject({
      ok: false,
      attempts: 1,
      failure: { category: "configuration", retryable: false },
    });
  });

  test("classifies gateway failures before deciding whether to retry", () => {
    expect(
      gatewayFailureFromResponse(503, {
        error: "no_ai_provider_available",
        warnings: ["nvidia:model: provider_http_429"],
      }),
    ).toMatchObject({ category: "transient", retryable: true, status: 503 });

    expect(
      gatewayFailureFromResponse(503, {
        error: "no_ai_provider_available",
        warnings: ["nvidia_not_configured"],
      }),
    ).toMatchObject({
      category: "configuration",
      retryable: false,
      status: 503,
    });

    expect(
      gatewayFailureFromResponse(503, {
        error: "no_ai_provider_available",
        warnings: ["nvidia:model: Unauthorized API key"],
      }),
    ).toMatchObject({
      category: "authorization",
      retryable: false,
      status: 503,
    });
  });

  test("turns a hung page request into a bounded transient failure", async () => {
    const [result] = await runBoundedWithRetry(
      ["home"],
      async () => await new Promise<never>(() => {}),
      {
        concurrency: 1,
        maxAttempts: 1,
        timeoutMs: 10,
        delayMs: 0,
      },
    );

    expect(result).toMatchObject({
      ok: false,
      attempts: 1,
      failure: {
        code: "gateway_timeout",
        category: "transient",
        retryable: true,
        status: 504,
      },
    });
  });

  test("keeps verified business context but removes authoring instructions from notes", () => {
    expect(
      sanitizePublicBriefNotes(
        "Family-focused clinic in Haliya. Demo/test website. Do not invent doctor names. Create a content-rich, image-rich, fully responsive design.",
      ),
    ).toBe("Family-focused clinic in Haliya.");
    expect(sanitizePublicBriefNotes("Best dental care within budget.")).toBe(
      "Best dental care within budget.",
    );
  });
});
