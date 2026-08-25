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

const pearlSections = [
  { id: "nav-1", component: { componentId: "MIN-NAV-003", version: "1.0.0" }, props: { title: "Pearl Dental", items: [{ title: "Home", href: "/" }, { title: "Treatments", href: "#services" }, { title: "Contact", href: "#contact" }], primaryAction: { label: "Book appointment", href: "#contact" } }, bindings: {}, hidden: false },
  { id: "hero-2", component: { componentId: "MIN-HERO-004", version: "1.0.0" }, props: { eyebrow: "Dental", title: "Pearl Dental", description: "book appointments", primaryAction: { label: "Book appointment", href: "#contact" }, secondaryAction: { label: "Explore treatments", href: "#services" } }, bindings: {}, hidden: false },
  { id: "gallery-3", component: { componentId: "MIN-GALL-002", version: "1.0.0" }, props: { eyebrow: "Gallery", title: "Gallery", description: "Verified clinic and treatment imagery can be presented here.", items: [] }, bindings: {}, hidden: false },
  { id: "services-4", component: { componentId: "MIN-SERV-003", version: "1.0.0" }, props: { eyebrow: "Treatments", title: "Treatments", description: "Explore the treatments supplied by the clinic.", items: [] }, bindings: {}, hidden: false },
  { id: "doctor-5", component: { componentId: "MIN-TEAM-002", version: "1.0.0" }, props: { eyebrow: "Team", title: "Clinical team", description: "Verified clinician profiles and qualifications can be presented here.", items: [] }, bindings: {}, hidden: false },
  { id: "proof-6", component: { componentId: "MIN-TEST-002", version: "1.0.0" }, props: { eyebrow: "Patient feedback", title: "Patient feedback", description: "Only verified patient feedback should be published here.", items: [] }, bindings: {}, hidden: false },
  { id: "process-7", component: { componentId: "MIN-PROC-003", version: "1.0.0" }, props: { eyebrow: "Next steps", title: "What happens next", description: "Contact the clinic to discuss the appropriate next step.", items: [] }, bindings: {}, hidden: false },
  { id: "cta-8", component: { componentId: "MIN-CTA-002", version: "1.0.0" }, props: { eyebrow: "Next step", title: "Ready to get in touch?", description: "Request an appointment to discuss your needs.", primaryAction: { label: "Book appointment", href: "#contact" } }, bindings: {}, hidden: false },
  { id: "contact-9", component: { componentId: "MIN-CONT-002", version: "1.0.0" }, props: { eyebrow: "Contact", title: "Request an appointment", description: "Send your details and preferred contact information to request an appointment.", primaryAction: { label: "Send request", href: "#contact-form" } }, bindings: {}, hidden: false },
  { id: "footer-10", component: { componentId: "MIN-FOOT-005", version: "1.0.0" }, props: { title: "Pearl Dental", description: "Business information and contact options.", items: [{ title: "Home", href: "/" }, { title: "Contact", href: "#contact" }] }, bindings: {}, hidden: false },
];

const pearlSite = {
  ...site,
  name: "Pearl Dental",
  theme: {
    ...site.theme,
    brand: {
      ...site.theme.brand,
      colors: { primary: "#102A43", secondary: "#163A52", accent: "#2A9D9F", background: "#FAFBFC", surface: "#FFFFFF", textPrimary: "#10202F", textSecondary: "#617384", border: "#DCE6E8", success: "#177A55", warning: "#AD6A00", error: "#C93636" },
    },
  },
  seoBlueprint: { primaryGoal: "book appointments", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: false, servicePages: false, locationPages: false, blog: false },
  pages: [{ id: "home", path: "/", name: "Home", sections: pearlSections, seo: { title: "Pearl Dental", description: "Pearl Dental — book appointments.", canonicalPath: "/", indexable: true, structuredDataTypes: [] } }],
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

test("Pearl Dental certified materialization renders through editor and preview without placeholders", async ({ page }) => {
  const componentIds = pearlSections.map(section => section.component.componentId);
  expect(componentIds).toEqual(["MIN-NAV-003", "MIN-HERO-004", "MIN-GALL-002", "MIN-SERV-003", "MIN-TEAM-002", "MIN-TEST-002", "MIN-PROC-003", "MIN-CTA-002", "MIN-CONT-002", "MIN-FOOT-005"]);
  expect(componentIds.some(id => id.endsWith(".placeholder"))).toBe(false);
  expect(pearlSite.theme.brand.colors).toMatchObject({ primary: "#102A43", accent: "#2A9D9F", background: "#FAFBFC" });
  expect(pearlSections.find(section => section.id.startsWith("services"))?.props.items).toEqual([]);

  await page.unroute("**/api/drafts**");
  await page.route("**/api/drafts**", async route => {
    const draft = { workspaceId: "workspace-demo", siteId: "workspace-preview", revision: 4, snapshot: pearlSite, updatedAt: now, updatedBy: "smoke-user" };
    return route.fulfill({ json: { draft } });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Open editor" }).first().click();
  await expect(page.getByText("Pearl Dental").first()).toBeVisible();
  await expect(page.getByText("Treatments").first()).toBeVisible();
  await expect(page.getByText("Request an appointment").first()).toBeVisible();
  await expect(page.getByText("Clinical team").first()).toBeVisible();
  await expect(page.getByText("Only verified patient feedback should be published here.").first()).toBeVisible();

  const previewPublish = page.getByRole("button", { name: /Preview.*publish|Publish/i }).last();
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
