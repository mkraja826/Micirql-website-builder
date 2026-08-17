import { expect, test } from "@playwright/test";

const now = new Date().toISOString();
const site = {
  schemaVersion: "1.0.0",
  siteId: "workspace-preview",
  workspaceId: "workspace-demo",
  name: "Smoke Test Clinic",
  domain: "clinic",
  theme: {
    family: "minimalist",
    modifiers: ["light"],
    brand: {
      colors: { primary: "#6d5dfc", secondary: "#171717", accent: "#8b7fff", background: "#ffffff", surface: "#f5f5f7", textPrimary: "#111111", textSecondary: "#65656b", border: "#dddde3", success: "#168a4a", warning: "#ad6a00", error: "#c93636" },
      typography: { display: "Arial", body: "Arial", ui: "Arial" },
      density: "comfortable",
      shape: "balanced",
      motion: "subtle",
    },
  },
  seoBlueprint: { primaryGoal: "Generate enquiries", targetLocations: ["Hyderabad"], priorityTopics: ["Dental implants"], audiences: ["Patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
  pages: [{ id: "home", path: "/", name: "Home", sections: [{ id: "hero-1", component: { componentId: "hero.placeholder", version: "1.0.0" }, props: { eyebrow: "Dental clinic", heading: "Confident smiles start here", body: "Book an appointment with our clinic." }, bindings: {}, hidden: false }], seo: { title: "Smoke Test Clinic", description: "Dental care in Hyderabad.", canonicalPath: "/", indexable: true, structuredDataTypes: [] } }],
  navigation: [{ label: "Home", href: "/" }],
  integrations: [],
  domains: [],
};

const project = { id: "workspace-preview", workspace_id: "workspace-demo", name: "Smoke Test Clinic", status: "draft", published_version_id: null, updated_at: now, draft: { revision: 3, updated_at: now }, hostname: null };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "smoke-token", refresh_token: "smoke-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: "smoke-user", email: "smoke@micirql.test" } }));
  });

  await page.route("**/api/projects**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { projects: [project] } });
    return route.fulfill({ json: { project } });
  });
  await page.route("**/api/onboarding**", async route => route.fulfill({ json: { completed: true, profile: null } }));
  await page.route("**/api/drafts**", async route => {
    const draft = { workspaceId: "workspace-demo", siteId: "workspace-preview", revision: 3, snapshot: site, updatedAt: now, updatedBy: "smoke-user" };
    return route.fulfill({ json: { draft } });
  });
  await page.route("**/api/credits**", async route => route.fulfill({ json: { balance: 100 } }));
  await page.route("**/api/publish**", async route => route.fulfill({ json: { ok: true, url: "https://smoke.micirql.com", versionId: "v-smoke" } }));
});

test("dashboard to editor to preview and publish review", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Your websites" })).toBeVisible();
  await expect(page.getByText("Smoke Test Clinic")).toBeVisible();

  await page.getByRole("button", { name: "Open editor" }).first().click();
  await expect(page.getByRole("button", { name: /Back to projects/i })).toBeVisible();
  await expect(page.getByText("Smoke Test Clinic")).toBeVisible();
  await expect(page.getByText("Confident smiles start here")).toBeVisible();

  const previewPublish = page.getByRole("button", { name: /Preview.*publish|Publish/i }).last();
  await expect(previewPublish).toBeVisible();
  await previewPublish.click();
  await expect(page.getByText(/Launch ready|launch blocker/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Desktop/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mobile/i })).toBeVisible();
});
