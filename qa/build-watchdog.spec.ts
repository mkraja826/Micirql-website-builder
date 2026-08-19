import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site, type SitePlan } from "@micirql/schema";
import { inspectBuildCompleteness, runBuildWithWatchdog } from "@micirql/ai";

function site(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "watchdog-site",
    workspaceId: "watchdog-workspace",
    name: "Watchdog Dental",
    domain: "clinic",
    subtype: "dental",
    theme: { family: "minimalist", modifiers: ["light"], brand: { colors: { primary: "#315E62", secondary: "#173B40", accent: "#C49A64", background: "#FFFFFF", surface: "#F3F7F6", textPrimary: "#111111", textSecondary: "#555555", border: "#D8E2E0", success: "#167A55", warning: "#9A6500", error: "#B42318" }, typography: { display: "Inter", body: "Inter", ui: "Inter" }, density: "comfortable", shape: "balanced", motion: "subtle" } },
    seoBlueprint: { primaryGoal: "Book dental appointments", targetLocations: ["Hyderabad"], priorityTopics: ["Dental care"], audiences: ["Patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections: [{ id: "hero", component: { componentId: "hero.planner-v1", version: "1.0.0" }, props: { heading: "Dental care", body: "Book an appointment." }, bindings: {}, hidden: false }], seo: { title: "Watchdog Dental", description: "Dental care in Hyderabad.", canonicalPath: "/", indexable: true, structuredDataTypes: [] } }],
    navigation: [{ label: "Home", href: "/" }], integrations: [], domains: []
  });
}

const plan = {
  pages: [
    { path: "/", name: "Home", sections: [{ family: "hero" }] },
    { path: "/contact", name: "Contact", sections: [{ family: "contact" }] },
  ]
} as unknown as SitePlan;

test("watchdog detects missing planned pages", () => {
  const issues = inspectBuildCompleteness(site(), plan);
  expect(issues.some((issue) => issue.code === "MISSING_PLANNED_PAGE" && issue.pagePath === "/contact")).toBeTruthy();
});

test("watchdog recovers incomplete build to last known good site", async () => {
  const previous = site();
  const incomplete = structuredClone(previous);
  incomplete.pages[0]!.sections = [];

  const result = await runBuildWithWatchdog({
    execute: async () => ({ site: incomplete, plan: undefined }),
    lastKnownGood: previous,
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.recovered).toBe(true);
  expect(result.issues.some((issue) => issue.code === "EMPTY_PAGE")).toBeTruthy();
  expect(result.fallbackSite).toEqual(previous);
});

test("watchdog times out a stuck build and preserves last known good site", async () => {
  const previous = site();
  const result = await runBuildWithWatchdog({
    execute: () => new Promise<{ site: Site }>(() => {}),
    timeoutMs: 1_000,
    lastKnownGood: previous,
  });

  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.recovered).toBe(true);
  expect(result.issues[0]?.code).toBe("BUILD_TIMEOUT");
  expect(result.fallbackSite).toEqual(previous);
});

test("watchdog accepts complete build without fallback", async () => {
  const current = site();
  const result = await runBuildWithWatchdog({ execute: async () => ({ site: current }) });
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.value.site).toEqual(current);
  expect(result.issues).toEqual([]);
});
