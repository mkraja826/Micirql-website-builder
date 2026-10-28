import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { NextRequest } from "next/server";
import { SCHEMA_VERSION, type Site } from "@micirql/schema";
import { saveSupabaseDraft } from "../apps/builder/app/api/drafts/supabase-store";

const SUPABASE_URL = "https://draft-security.supabase.test";
const PUBLIC_KEY = "sb_publishable_draft_security";
const SERVICE_KEY = "service-header.service-payload.service-signature";
const USER_ID = "11111111-1111-4111-8111-111111111111";
const WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const SITE_ID = "33333333-3333-4333-8333-333333333333";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalPublicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const originalAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalMicirqlSecret = process.env.MICIRQL_SUPABASE_SECRET_KEY;

test.describe.serial("Builder draft RPC security boundary", () => {
  test.beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = PUBLIC_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.MICIRQL_SUPABASE_SECRET_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_KEY;
  });

  test.afterEach(() => {
    globalThis.fetch = originalFetch;
    restoreEnv("NEXT_PUBLIC_SUPABASE_URL", originalUrl);
    restoreEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", originalPublicKey);
    restoreEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", originalAnonKey);
    restoreEnv("SUPABASE_SERVICE_ROLE_KEY", originalServiceKey);
    restoreEnv("MICIRQL_SUPABASE_SECRET_KEY", originalMicirqlSecret);
  });

  test("revokes direct authenticated execution and retains RPC validation", async () => {
    const sql = await readFile(
      join(
        process.cwd(),
        "supabase/migrations/20261027120000_harden_builder_site_draft_rpc.sql",
      ),
      "utf8",
    );
    const compact = sql.replace(/\s+/g, " ");

    expect(compact).toContain(
      "from public, anon, authenticated; grant execute on function public.save_builder_site_draft",
    );
    expect(compact).toContain("to service_role;");
    expect(compact).not.toMatch(/grant execute[^;]+to authenticated/i);
    expect(compact).toContain("auth.role() is distinct from 'service_role'");
    expect(compact).toContain("p_updated_by is null");
    expect(compact).toContain("auth.users u where u.id = p_updated_by");
    expect(compact).toContain("p_expected_revision < 0");
    expect(compact).toContain("site does not belong to workspace");
    expect(compact).toContain("builder site snapshot identity mismatch");
    expect(compact).toContain("public.validate_site_snapshot(p_snapshot)");
    expect(compact).toContain("for update;");
    expect(compact).toContain("workspace draft revision conflict");
  });

  test("fails closed when the server-only draft credential is absent", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.MICIRQL_SUPABASE_SECRET_KEY;
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      return Response.json(null);
    };

    await expect(
      saveSupabaseDraft(requestFor(USER_ID), {
        snapshot: siteFixture(),
        expectedRevision: 1,
      }),
    ).rejects.toThrow(
      "MICIRQL_SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is required for secure draft writes.",
    );
    expect(fetchCount).toBe(0);
  });

  test("uses the service role only for the write and the user JWT for the RLS reload", async () => {
    const calls: Array<{
      url: string;
      method: string;
      headers: Headers;
      body?: string;
    }> = [];
    const snapshot = siteFixture();
    globalThis.fetch = async (input, init) => {
      const call = {
        url: String(input),
        method: init?.method ?? "GET",
        headers: new Headers(init?.headers),
        ...(typeof init?.body === "string" ? { body: init.body } : {}),
      };
      calls.push(call);
      if (call.url.endsWith("/rest/v1/rpc/has_workspace_role")) {
        return Response.json(true);
      }
      if (call.url.endsWith("/rest/v1/rpc/save_builder_site_draft")) {
        return Response.json(2);
      }
      return Response.json([
        {
          workspace_id: WORKSPACE_ID,
          site_id: SITE_ID,
          revision: 2,
          snapshot,
          updated_at: "2026-10-27T12:00:00.000Z",
          updated_by: USER_ID,
        },
      ]);
    };

    const saved = await saveSupabaseDraft(requestFor(USER_ID), {
      snapshot,
      expectedRevision: 1,
      updatedBy: USER_ID,
    });

    expect(saved.revision).toBe(2);
    expect(calls).toHaveLength(3);
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.headers.get("apikey")).toBe(PUBLIC_KEY);
    expect(calls[0]!.headers.get("authorization")).toBe(
      `Bearer ${tokenFor(USER_ID)}`,
    );
    expect(JSON.parse(calls[0]!.body!)).toMatchObject({
      target_workspace_id: WORKSPACE_ID,
      allowed_roles: ["owner", "admin", "editor"],
    });

    expect(calls[1]!.method).toBe("POST");
    expect(calls[1]!.headers.get("apikey")).toBe(SERVICE_KEY);
    expect(calls[1]!.headers.get("authorization")).toBe(
      `Bearer ${SERVICE_KEY}`,
    );
    expect(JSON.parse(calls[1]!.body!)).toMatchObject({
      p_workspace_id: WORKSPACE_ID,
      p_site_id: SITE_ID,
      p_expected_revision: 1,
      p_updated_by: USER_ID,
    });

    expect(calls[2]!.url).toContain("/rest/v1/workspace_drafts?");
    expect(calls[2]!.headers.get("apikey")).toBe(PUBLIC_KEY);
    expect(calls[2]!.headers.get("authorization")).toBe(
      `Bearer ${tokenFor(USER_ID)}`,
    );
  });

  test("keeps the existing MiCirql server-secret binding compatible", async () => {
    const currentSecret = "sb_secret_current_builder_binding";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.MICIRQL_SUPABASE_SECRET_KEY = currentSecret;
    const calls: Array<{ url: string; headers: Headers }> = [];
    const snapshot = siteFixture();
    globalThis.fetch = async (input, init) => {
      const call = {
        url: String(input),
        headers: new Headers(init?.headers),
      };
      calls.push(call);
      if (call.url.endsWith("/rest/v1/rpc/has_workspace_role")) {
        return Response.json(true);
      }
      if (call.url.endsWith("/rest/v1/rpc/save_builder_site_draft")) {
        return Response.json(2);
      }
      return Response.json([
        {
          workspace_id: WORKSPACE_ID,
          site_id: SITE_ID,
          revision: 2,
          snapshot,
          updated_at: "2026-10-27T12:00:00.000Z",
          updated_by: USER_ID,
        },
      ]);
    };

    await saveSupabaseDraft(requestFor(USER_ID), {
      snapshot,
      expectedRevision: 1,
    });

    expect(calls[0]!.headers.get("apikey")).toBe(PUBLIC_KEY);
    expect(calls[0]!.headers.get("authorization")).toBe(
      `Bearer ${tokenFor(USER_ID)}`,
    );
    expect(calls[1]!.headers.get("apikey")).toBe(currentSecret);
    expect(calls[1]!.headers.get("authorization")).toBeNull();
    expect(calls[2]!.headers.get("apikey")).toBe(PUBLIC_KEY);
    expect(calls[2]!.headers.get("authorization")).toBe(
      `Bearer ${tokenFor(USER_ID)}`,
    );
  });

  test("does not promote a read-only member to the server write role", async () => {
    const calls: Array<{ url: string; headers: Headers }> = [];
    globalThis.fetch = async (input, init) => {
      const call = {
        url: String(input),
        headers: new Headers(init?.headers),
      };
      calls.push(call);
      if (call.url.endsWith("/rest/v1/rpc/has_workspace_role")) {
        return Response.json(false);
      }
      throw new Error("A read-only member reached a draft write or reload.");
    };

    await expect(
      saveSupabaseDraft(requestFor(USER_ID), {
        snapshot: siteFixture(),
        expectedRevision: 1,
      }),
    ).rejects.toThrow("INSUFFICIENT_WORKSPACE_ROLE");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain("/rest/v1/rpc/has_workspace_role");
    expect(calls[0]!.headers.get("apikey")).toBe(PUBLIC_KEY);
    expect(calls[0]!.headers.get("authorization")).toBe(
      `Bearer ${tokenFor(USER_ID)}`,
    );
  });

  test("does not let a server caller spoof the recorded user", async () => {
    let fetchCount = 0;
    globalThis.fetch = async () => {
      fetchCount += 1;
      return Response.json(null);
    };

    await expect(
      saveSupabaseDraft(requestFor(USER_ID), {
        snapshot: siteFixture(),
        expectedRevision: 1,
        updatedBy: "44444444-4444-4444-8444-444444444444",
      }),
    ).rejects.toThrow("updatedBy must match the authenticated user.");
    expect(fetchCount).toBe(0);
  });
});

function requestFor(userId: string) {
  return new NextRequest("https://builder.micirql.test/api/drafts", {
    headers: { authorization: `Bearer ${tokenFor(userId)}` },
  });
}

function tokenFor(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId })).toString(
    "base64url",
  );
  return `qa-header.${payload}.qa-signature`;
}

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function siteFixture(): Site {
  return {
    schemaVersion: SCHEMA_VERSION,
    siteId: SITE_ID,
    workspaceId: WORKSPACE_ID,
    name: "Draft security fixture",
    domain: "restaurant",
    subtype: "restaurant",
    theme: {
      family: "editorial",
      modifiers: ["light", "photography-led"],
      brand: {
        colors: {
          primary: "#744525",
          secondary: "#26302a",
          accent: "#bc6d3e",
          background: "#fffaf1",
          surface: "#f4ead8",
          textPrimary: "#201b17",
          textSecondary: "#66594f",
          border: "#d8c7ae",
          success: "#2f7448",
          warning: "#9b621f",
          error: "#aa3838",
        },
        typography: {
          display: "Source Serif 4",
          body: "Inter",
          ui: "Inter",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Present the restaurant and accept table requests",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [
          {
            id: "hero-home",
            component: { componentId: "hero.split", version: "1.0.0" },
            props: { heading: "Draft security fixture" },
            bindings: {},
            hidden: false,
          },
        ],
        seo: {
          title: "Draft security fixture",
          description: "A secure draft fixture.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: [],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  };
}
