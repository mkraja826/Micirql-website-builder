import { expect, test } from "@playwright/test";
import { repairContentDepth } from "../apps/builder/app/content-depth-repair";

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

const generatedSite = {
  ...site,
  name: "AI Generated Dental",
  pages: [{ ...site.pages[0], sections: [{ ...site.pages[0]!.sections[0], props: { eyebrow: "Dental implants in Hyderabad", heading: "Restore your smile with confidence", body: "Explore implant care and request an appointment." } }] }],
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
  await page.route("**/api/publish**", async route => route.fulfill({ json: { ok: true, version: { versionId: "v-smoke" }, liveUrl: "https://smoke.micirql.com" } }));
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
  await expect(page.getByText(/Ready to launch|blocker/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Desktop/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mobile/i })).toBeVisible();
});

test("generated design choices survive editor back-navigation and can be reselected", async ({ page }) => {
  let generated = false;
  await page.unroute("**/api/onboarding**");
  await page.unroute("**/api/drafts**");

  const profile = {
    industry: "healthcare clinic",
    subindustry: "oral care",
    goals: ["book appointments"],
    style_tags: ["premium", "professional"],
    required_capabilities: ["booking"],
    services: ["Dental implants", "Crowns", "Root canal"],
  };

  await page.route("**/api/onboarding**", async route => {
    if (route.request().method() === "POST") {
      generated = true;
      return route.fulfill({ json: { ok: true, profile, selectedLayout: { id: "layout-1" } } });
    }
    return route.fulfill({ json: { completed: false, profile: null } });
  });
  await page.route("**/api/onboarding/interpret**", async route => route.fulfill({ json: {
    profile: {
      businessName: "AI Generated Dental",
      industry: "healthcare clinic",
      subindustry: "oral care",
      location: "Hyderabad",
      services: ["Dental implants", "Crowns", "Root canal"],
      goals: ["book appointments"],
      styleTags: ["premium", "professional"],
      requiredCapabilities: ["booking"],
      languages: ["en"],
      notes: "Premium oral care clinic in Hyderabad",
    },
    layoutRecommendation: { id: "layout-1", name: "Premium clinic", description: "Conversion-led healthcare layout", score: 94, reasons: ["Clinic fit"], preferredSubindustry: "oral care" },
  } }));
  await page.route("**/api/onboarding/architect**", async route => route.fulfill({ json: { ok: true, content: { fallbackUsed: false, recovery: { attemptedProviders: 1, failedProviders: 0 } }, contentWarning: null, mediaWarning: null, generatedMediaCount: 1, exactPlacement: { placed: 1 }, functionalBindings: { bound: ["booking"] } } }));
  await page.route("**/api/design-preferences**", async route => route.fulfill({ json: {} }));
  await page.route("**/api/drafts**", async route => {
    const draft = { workspaceId: "workspace-demo", siteId: "workspace-preview", revision: generated ? 4 : 3, snapshot: generated ? generatedSite : site, updatedAt: now, updatedBy: "smoke-user" };
    return route.fulfill({ json: { draft } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Open editor" }).first().click();
  await expect(page.getByRole("heading", { name: "Describe the website you want." })).toBeVisible();

  await page.getByLabel("Your website brief").fill("AI Generated Dental is a premium oral care clinic in Hyderabad offering dental implants, crowns and root canal treatment, with appointment booking as the main goal.");
  await page.getByRole("button", { name: "Analyze my brief" }).click();
  await expect(page.getByText("What MiCirql understood")).toBeVisible();
  await page.getByRole("button", { name: "Build my website" }).click();

  await expect(page.getByRole("heading", { name: "Choose your design direction." })).toBeVisible();
  const useButtons = page.getByRole("button", { name: "Use this design" });
  await expect(useButtons.first()).toBeVisible();
  await useButtons.first().click();

  await expect(page.getByRole("button", { name: "← Designs" })).toBeVisible();
  await expect(page.getByText("Restore your smile with confidence").first()).toBeVisible();
  await page.getByRole("button", { name: "← Designs" }).click();

  await expect(page.getByRole("heading", { name: "Choose your design direction." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Use this design" }).nth(1)).toBeVisible();
  await page.getByRole("button", { name: "Use this design" }).nth(1).click();
  await expect(page.getByRole("button", { name: "← Designs" })).toBeVisible();
});

test("repairs heading-only generated content before the editor", async () => {
  const shallow = structuredClone(site);
  shallow.pages[0]!.sections[0]!.props = { eyebrow: "Dental clinic", heading: "Advanced dental care" };
  const repaired = repairContentDepth(shallow as Parameters<typeof repairContentDepth>[0]);
  const props = repaired.pages[0]!.sections[0]!.props as Record<string, unknown>;
  const body = typeof props.body === "string" ? props.body : typeof props.description === "string" ? props.description : "";
  expect(body.length).toBeGreaterThanOrEqual(48);
  expect(body).toContain("Smoke Test Clinic");
});
