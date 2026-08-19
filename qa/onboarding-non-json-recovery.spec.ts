import { expect, test } from "@playwright/test";
import { ApiResponseError, customerSafeApiMessage, fetchJsonWithRetry, readJsonResponse } from "../apps/builder/app/safe-api-json";

test("HTML error page never leaks into onboarding UI and transient failure retries", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) {
      return new Response("<!DOCTYPE html><html><body>Cloudflare error</body></html>", {
        status: 503,
        headers: { "content-type": "text/html; charset=UTF-8" },
      });
    }
    return Response.json({ ok: true, profile: { businessName: "Aurelia Dental" } });
  }) as typeof fetch;

  try {
    const result = await fetchJsonWithRetry<{ ok: boolean; profile: { businessName: string } }>(
      "/api/onboarding/interpret",
      { method: "POST" },
      { retries: 1 },
    );
    expect(result.attempts).toBe(2);
    expect(result.payload.profile.businessName).toBe("Aurelia Dental");
    expect(calls).toBe(2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("persistent HTML response becomes a safe customer message", async () => {
  const response = new Response("<!DOCTYPE html><html><body>Internal routing error</body></html>", {
    status: 503,
    headers: { "content-type": "text/html" },
  });

  let caught: unknown;
  try {
    await readJsonResponse(response);
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeInstanceOf(ApiResponseError);
  expect((caught as ApiResponseError).code).toBe("NON_JSON_API_RESPONSE");
  const message = customerSafeApiMessage(caught, "MiCirql couldn’t understand the brief right now. Please try again.");
  expect(message).not.toContain("DOCTYPE");
  expect(message).not.toContain("Unexpected token");
  expect(message).toContain("retrying safely");
});
