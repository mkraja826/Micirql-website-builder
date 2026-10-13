import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import { GET as getDraft } from "../apps/builder/app/api/drafts/route";
import { GET as getProjects } from "../apps/builder/app/api/projects/route";

test("project API preserves an upstream authentication 401", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  globalThis.fetch = async () =>
    new Response('{"message":"JWT expired"}', { status: 401 });

  try {
    const response = await getProjects(
      new NextRequest("https://builder.micirql.com/api/projects", {
        headers: { authorization: "Bearer expired-access-token" },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Supabase request failed (401).",
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});

test("draft bootstrap preserves an upstream authentication 401", async () => {
  const originalFetch = globalThis.fetch;
  const originalStore = process.env.MICIRQL_DRAFT_STORE;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let fetchCalls = 0;

  process.env.MICIRQL_DRAFT_STORE = "supabase";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  globalThis.fetch = async () => {
    fetchCalls += 1;
    if (fetchCalls === 1) return Response.json([]);
    return new Response('{"message":"JWT expired"}', { status: 401 });
  };

  try {
    const query = new URLSearchParams({
      workspaceId: "00000000-0000-4000-8000-000000000001",
      siteId: "00000000-0000-4000-8000-000000000002",
    });
    const response = await getDraft(
      new NextRequest(
        `https://builder.micirql.com/api/drafts?${query.toString()}`,
        { headers: { authorization: "Bearer expired-access-token" } },
      ),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Supabase context request failed (401).",
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStore === undefined) delete process.env.MICIRQL_DRAFT_STORE;
    else process.env.MICIRQL_DRAFT_STORE = originalStore;
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    if (originalKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = originalKey;
  }
});
