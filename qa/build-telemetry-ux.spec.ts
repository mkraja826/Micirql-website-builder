import { expect, test } from "@playwright/test";

const now = new Date().toISOString();
const site = {
  schemaVersion: "1.0.0",
  siteId: "workspace-preview",
  workspaceId: "workspace-demo",
  name: "Recovery Dental",
  domain: "clinic",
  theme: { family: "minimalist", modifiers: ["light"], brand: { colors: { primary: "#6d5dfc", secondary: "#171717", accent: "#8b7fff", background: "#ffffff", surface: "#f5f5f7", textPrimary: "#111111", textSecondary: "#65656b", border: "#dddde3", success: "#168a4a", warning: "#ad6a00", error: "#c93636" }, typography: { display: "Arial", body: "Arial", ui: "Arial" }, density: "comfortable", shape: "balanced", motion: "subtle" } },
  seoBlueprint: { primaryGoal: "Generate enquiries", targetLocations: ["Hyderabad"], priorityTopics: ["Dental implants"], audiences: ["Patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
  pages: [{ id: "home", path: "/", name: "Home", sections: [{ id: "hero-1", component: { componentId: "MIN-HERO-001", version: "1.0.0" }, props: { heading: "Recovery Dental", body: "Dental care in Hyderabad." }, bindings: {}, hidden: false }], seo: { title: "Recovery Dental", description: "Dental care in Hyderabad.", canonicalPath: "/", indexable: true, structuredDataTypes: [] } }],
  navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
};
const project = { id: "workspace-preview", workspace_id: "workspace-demo", name: "Recovery Dental", status: "draft", published_version_id: null, updated_at: now, draft: { revision: 3, updated_at: now }, hostname: null };
const profile = { industry: "dental", subindustry: "dental implants", goals: ["book appointments"], style_tags: ["premium"], required_capabilities: ["booking"], services: ["Dental implants"], business_name: "Recovery Dental", location: "Hyderabad" };

test("build shows real stage telemetry and surfaces provider recovery", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "smoke-token", refresh_token: "smoke-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: "smoke-user", email: "smoke@micirql.test" } })));
  await page.route("**/api/projects**", (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/drafts**", (route) => route.fulfill({ json: { draft: { workspaceId: "workspace-demo", siteId: "workspace-preview", revision: 3, snapshot: site, updatedAt: now, updatedBy: "smoke-user" } } }));
  let completed = false;
  await page.route("**/api/onboarding**", async (route) => {
    if (route.request().method() === "POST") { completed = true; return route.fulfill({ json: { ok: true, profile } }); }
    return route.fulfill({ json: { completed, profile: completed ? profile : null } });
  });
  await page.route("**/api/onboarding/interpret**", (route) => route.fulfill({ json: { profile: { businessName: "Recovery Dental", industry: "dental", subindustry: "dental implants", location: "Hyderabad", services: ["Dental implants"], goals: ["book appointments"], styleTags: ["premium"], requiredCapabilities: ["booking"], languages: ["en"], notes: "Dental implant clinic in Hyderabad" }, layoutRecommendation: { id: "layout-1", name: "Premium clinic", description: "Conversion-led dental layout", score: 94, reasons: ["Clinic fit"] } } }));
  await page.route("**/api/onboarding/architect**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return route.fulfill({ json: { ok: true, content: { fallbackUsed: true, recovery: { attemptedProviders: 2, failedProviders: 1 } }, contentWarning: null, mediaWarning: null, generatedMediaCount: 1, exactPlacement: { placed: 0 }, functionalBindings: { bound: ["booking"] } } });
  });
  await page.route("**/api/design-preferences**", (route) => route.fulfill({ json: {} }));
  await page.route("**/api/credits**", (route) => route.fulfill({ json: { balance: 100 } }));

  await page.goto("/");
  await page.getByRole("button", { name: "Open editor" }).first().click();
  await page.getByLabel("Your website brief").fill("Recovery Dental is a premium dental implant clinic in Hyderabad focused on appointment bookings.");
  await page.getByRole("button", { name: "Analyze my brief" }).click();
  await expect(page.getByText("What MiCirql understood")).toBeVisible();
  await page.getByRole("button", { name: "Build my website" }).click();

  await expect(page.getByRole("heading", { name: "Designing pages" })).toBeVisible();
  await expect(page.getByText(/guarded stages/i)).toBeVisible();
  await expect(page.getByText("Build recovered safely")).toBeVisible();
  await expect(page.getByText(/provider failure/i)).toBeVisible();
});
