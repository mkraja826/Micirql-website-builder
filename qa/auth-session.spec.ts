import { expect, test } from "@playwright/test";
import { createAuthenticatedFetch } from "../apps/builder/app/authenticated-fetch";
import {
  isTerminalAuthFailure,
  type SupabaseSession,
} from "../apps/builder/app/auth-client";

function session(token: string, refreshToken: string, expiresAt: number) {
  return {
    access_token: token,
    refresh_token: refreshToken,
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: "bearer",
    user: { id: "user-1", email: "qa@example.com" },
  } satisfies SupabaseSession;
}

test.describe("authenticated builder session fetch", () => {
  test("discards sessions only for terminal refresh rejection", () => {
    expect(
      isTerminalAuthFailure(Object.assign(new Error(), { status: 400 })),
    ).toBe(true);
    expect(
      isTerminalAuthFailure(Object.assign(new Error(), { status: 401 })),
    ).toBe(true);
    expect(
      isTerminalAuthFailure(Object.assign(new Error(), { status: 403 })),
    ).toBe(true);
    expect(
      isTerminalAuthFailure(Object.assign(new Error(), { status: 429 })),
    ).toBe(false);
    expect(
      isTerminalAuthFailure(Object.assign(new Error(), { status: 503 })),
    ).toBe(false);
    expect(isTerminalAuthFailure(new TypeError("network unavailable"))).toBe(
      false,
    );
  });

  test("uses a fresh session without refreshing it", async () => {
    const now = 2_000_000_000_000;
    const current = session("current", "refresh-1", now / 1000 + 3600);
    let refreshCalls = 0;
    let authorization = "";

    const authenticatedFetch = createAuthenticatedFetch({
      session: current,
      now: () => now,
      refresh: async () => {
        refreshCalls += 1;
        return current;
      },
      onSession: () => {},
      onAuthFailure: () => {},
      fetcher: async (input, init) => {
        authorization =
          new Request(input, init).headers.get("authorization") ?? "";
        return new Response(null, { status: 200 });
      },
    });

    const response = await authenticatedFetch(
      "https://builder.micirql.com/api/projects",
    );

    expect(response.status).toBe(200);
    expect(refreshCalls).toBe(0);
    expect(authorization).toBe("Bearer current");
  });

  test("refreshes an expiring session once across concurrent requests", async () => {
    const now = 2_000_000_000_000;
    const stale = session("stale", "refresh-1", now / 1000 + 30);
    const fresh = session("fresh", "refresh-2", now / 1000 + 3600);
    const authorizations: string[] = [];
    let refreshCalls = 0;
    let committed: SupabaseSession | undefined;

    const authenticatedFetch = createAuthenticatedFetch({
      session: stale,
      now: () => now,
      refresh: async () => {
        refreshCalls += 1;
        await Promise.resolve();
        return fresh;
      },
      onSession: (value) => {
        committed = value;
      },
      onAuthFailure: () => {
        throw new Error("unexpected auth failure");
      },
      fetcher: async (input, init) => {
        authorizations.push(
          new Request(input, init).headers.get("authorization") ?? "",
        );
        return new Response(null, { status: 200 });
      },
    });

    await Promise.all([
      authenticatedFetch("https://builder.micirql.com/api/projects"),
      authenticatedFetch("https://builder.micirql.com/api/drafts"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(committed).toEqual(fresh);
    expect(authorizations).toEqual(["Bearer fresh", "Bearer fresh"]);
  });

  test("refreshes and retries a 401 once without consuming a Request body", async () => {
    const now = 2_000_000_000_000;
    const current = session("current", "refresh-1", now / 1000 + 3600);
    const fresh = session("fresh", "refresh-2", now / 1000 + 7200);
    const attempts: Array<{ authorization: string; body: string }> = [];
    let refreshCalls = 0;

    const authenticatedFetch = createAuthenticatedFetch({
      session: current,
      now: () => now,
      refresh: async () => {
        refreshCalls += 1;
        return fresh;
      },
      onSession: () => {},
      onAuthFailure: () => {
        throw new Error("unexpected auth failure");
      },
      fetcher: async (input, init) => {
        const request = new Request(input, init);
        attempts.push({
          authorization: request.headers.get("authorization") ?? "",
          body: await request.text(),
        });
        return new Response(null, {
          status: attempts.length === 1 ? 401 : 200,
        });
      },
    });
    const request = new Request("https://builder.micirql.com/api/projects", {
      method: "POST",
      headers: {
        Authorization: "Bearer captured-stale-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({ action: "create", name: "Dental QA" }),
    });

    const response = await authenticatedFetch(request);

    expect(response.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(attempts).toEqual([
      {
        authorization: "Bearer current",
        body: '{"action":"create","name":"Dental QA"}',
      },
      {
        authorization: "Bearer fresh",
        body: '{"action":"create","name":"Dental QA"}',
      },
    ]);
  });

  test("replays a one-shot stream body when a URL request receives a 401", async () => {
    const now = 2_000_000_000_000;
    const current = session("current", "refresh-1", now / 1000 + 3600);
    const fresh = session("fresh", "refresh-2", now / 1000 + 7200);
    const bodies: string[] = [];
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("streamed-body"));
        controller.close();
      },
    });

    const authenticatedFetch = createAuthenticatedFetch({
      session: current,
      now: () => now,
      refresh: async () => fresh,
      onSession: () => {},
      onAuthFailure: () => {
        throw new Error("unexpected auth failure");
      },
      fetcher: async (input, init) => {
        const request = new Request(input, init);
        bodies.push(await request.text());
        return new Response(null, { status: bodies.length === 1 ? 401 : 200 });
      },
    });

    const response = await authenticatedFetch(
      "https://builder.micirql.com/api/projects",
      {
        method: "POST",
        body: stream,
        // Node requires this for streaming request bodies; browsers ignore it.
        duplex: "half",
      } as RequestInit & { duplex: "half" },
    );

    expect(response.status).toBe(200);
    expect(bodies).toEqual(["streamed-body", "streamed-body"]);
  });

  test("shares one forced refresh across simultaneous 401 responses", async () => {
    const now = 2_000_000_000_000;
    const current = session("current", "refresh-1", now / 1000 + 3600);
    const fresh = session("fresh", "refresh-2", now / 1000 + 7200);
    let refreshCalls = 0;
    const authorizations: string[] = [];

    const authenticatedFetch = createAuthenticatedFetch({
      session: current,
      now: () => now,
      refresh: async () => {
        refreshCalls += 1;
        await Promise.resolve();
        return fresh;
      },
      onSession: () => {},
      onAuthFailure: () => {
        throw new Error("unexpected auth failure");
      },
      fetcher: async (input, init) => {
        const authorization =
          new Request(input, init).headers.get("authorization") ?? "";
        authorizations.push(authorization);
        return new Response(null, {
          status: authorization === "Bearer current" ? 401 : 200,
        });
      },
    });

    const responses = await Promise.all([
      authenticatedFetch("https://builder.micirql.com/api/projects"),
      authenticatedFetch("https://builder.micirql.com/api/drafts"),
    ]);

    expect(refreshCalls).toBe(1);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(
      authorizations.filter((value) => value === "Bearer current"),
    ).toHaveLength(2);
    expect(
      authorizations.filter((value) => value === "Bearer fresh"),
    ).toHaveLength(2);
  });

  test("returns a second 401 without clearing an otherwise refreshable session", async () => {
    const now = 2_000_000_000_000;
    const current = session("current", "refresh-1", now / 1000 + 3600);
    const fresh = session("fresh", "refresh-2", now / 1000 + 7200);
    let failures = 0;
    let fetchCalls = 0;

    const authenticatedFetch = createAuthenticatedFetch({
      session: current,
      now: () => now,
      refresh: async () => fresh,
      onSession: () => {},
      onAuthFailure: () => {
        failures += 1;
      },
      fetcher: async () => {
        fetchCalls += 1;
        return new Response(null, { status: 401 });
      },
    });

    const response = await authenticatedFetch(
      "https://builder.micirql.com/api/projects",
    );

    expect(response.status).toBe(401);
    expect(fetchCalls).toBe(2);
    expect(failures).toBe(0);
  });

  test("reports a shared refresh failure once", async () => {
    const now = 2_000_000_000_000;
    const stale = session("stale", "invalid-refresh", now / 1000 - 1);
    let failures = 0;
    let fetchCalls = 0;

    const authenticatedFetch = createAuthenticatedFetch({
      session: stale,
      now: () => now,
      refresh: async () => {
        throw new Error("refresh rejected");
      },
      onSession: () => {},
      onAuthFailure: () => {
        failures += 1;
      },
      fetcher: async () => {
        fetchCalls += 1;
        return new Response(null, { status: 200 });
      },
    });

    const results = await Promise.allSettled([
      authenticatedFetch("https://builder.micirql.com/api/projects"),
      authenticatedFetch("https://builder.micirql.com/api/drafts"),
    ]);

    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    expect(failures).toBe(1);
    expect(fetchCalls).toBe(0);
  });
});
