import { expect, test, type Page } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS } from "@micirql/design-engine";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const now = new Date().toISOString();
const FLAGSHIP_IDS = [
  "dental-01-clinical-authority",
  "dental-02-implant-luxury",
  "dental-03-smile-studio",
  "dental-05-digital-dentistry",
  "dental-08-boutique-cosmetic",
] as const;

const profile: OnboardingProfile = {
  industry: "dental clinic",
  subindustry: "implant-dentistry",
  goals: ["book appointments", "build trust"],
  style_tags: ["premium", "professional"],
  required_capabilities: ["booking", "contact", "team", "gallery", "treatment process"],
  services: ["dental implants", "cosmetic dentistry", "full-mouth rehabilitation"],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("micirql.supabase.session", JSON.stringify({
      access_token: "mobile-nav-token",
      refresh_token: "mobile-nav-refresh",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "mobile-nav-user", email: "mobile-nav@micirql.test" },
    }));
  });
});

for (const layoutId of FLAGSHIP_IDS) {
  test(`${layoutId} exposes a usable burger menu on mobile`, async ({ page }) => {
    const layout = DENTAL_LAYOUT_BLUEPRINTS.find((candidate) => candidate.id === layoutId);
    expect(layout).toBeTruthy();
    const site = buildSite(layout!);
    await installRoutes(page, site);
    await page.goto("/");
    await page.getByRole("button", { name: "Open editor" }).first().click();
    await page.getByRole("button", { name: /^mobile$/i }).click();

    const preview = page.locator(".site-preview.viewport-mobile");
    await expect(preview).toBeVisible();
    await preview.evaluate((node) => {
      const element = node as HTMLElement;
      element.style.setProperty("width", "390px", "important");
      element.style.setProperty("max-width", "390px", "important");
    });

    const burger = preview.locator(".mi-mobile-nav > .mi-burger").first();
    await expect(burger).toBeVisible();
    await expect(burger).toHaveAttribute("aria-label", "Open navigation menu");

    const size = await burger.boundingBox();
    expect(size).not.toBeNull();
    expect(size!.width).toBeGreaterThanOrEqual(44);
    expect(size!.height).toBeGreaterThanOrEqual(44);

    await burger.click();
    const drawer = preview.locator(".mi-mobile-nav[open] .mi-mobile-drawer").first();
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Treatments" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "About" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Contact" })).toBeVisible();

    const drawerBounds = await drawer.boundingBox();
    const previewBounds = await preview.boundingBox();
    expect(drawerBounds).not.toBeNull();
    expect(previewBounds).not.toBeNull();
    expect(drawerBounds!.width).toBeLessThanOrEqual(previewBounds!.width + 1);

    await burger.click();
    await expect(preview.locator(".mi-mobile-nav[open]")).toHaveCount(0);
  });
}

function buildSite(layout: NonNullable<(typeof DENTAL_LAYOUT_BLUEPRINTS)[number]>): Site {
  const name = "Aurelia Dental";
  const composition = composeWebsite(profile, {
    selectedLayoutId: layout.id,
    selectedLayoutScore: 100,
    selectedLayoutReasons: ["Flagship mobile navigation certification"],
  });
  const sections = [
    makeSection("global-navbar", "navbar", 1, composition.preset.theme.family, {
      title: name,
      items: [
        { title: "Treatments", href: "#services" },
        { title: "About", href: "#about" },
        { title: "Contact", href: "#contact" },
      ],
      primaryAction: { label: "Book consultation", href: "#contact" },
    }),
    ...composition.sections.map((section, index) => makeSection(
      `${section.family}-${index + 1}`,
      section.family,
      section.variant,
      composition.preset.theme.family,
      contentFor(section.family, name),
    )),
    makeSection("global-footer", "footer", 1, composition.preset.theme.family, {
      title: name,
      description: "Premium implant and cosmetic dentistry.",
      items: [{ title: "Treatments" }, { title: "Contact" }],
    }),
  ];

  const base = siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `mobile-nav-${layout.id}`,
    workspaceId: "mobile-nav-workspace",
    name,
    domain: "clinic",
    subtype: "dental",
    theme: composition.preset.theme,
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: profile.services ?? [],
      audiences: ["Dental patients"], languages: ["en"], localSeo: true,
      servicePages: true, locationPages: false, blog: false,
    },
    pages: [{
      id: "home", path: "/", name: "Home", sections,
      seo: { title: `${name} | Dental Care`, description: `Explore ${name}.`, canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] },
    }],
    navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
  });
  const coverage = layoutCoverage(base, layout);
  expect(coverage.complete, `${layout.id} fixture missing ${coverage.missing.join(", ")}`).toBe(true);
  return applyWebsiteLayoutBlueprint(base, layout);
}

function makeSection(id: string, family: SectionFamily, variant: 1|2|3|4|5, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function contentFor(family: SectionFamily, name: string): Record<string, unknown> {
  const items = ["Dental implants", "Cosmetic dentistry", "Full-mouth rehabilitation"].map((title) => ({ title, description: `${title} consultation information.` }));
  switch (family) {
    case "hero": return { eyebrow: "Premium implant dentistry", heading: "Precision dentistry with a more considered experience", body: `${name} presents modern implant care with clarity and confidence.`, primaryAction: { label: "Book consultation", href: "#contact" }, secondaryAction: { label: "Explore treatments", href: "#services" } };
    case "about": return { heading: "Care designed around clarity", body: "A considered patient experience from first enquiry through planning." };
    case "services": return { heading: "Treatments", body: "Explore the clinic's key treatment pathways.", items };
    case "features": return { heading: "Why the experience feels different", body: "Planning, technology and communication made clear.", items };
    case "process": return { heading: "Your treatment journey", body: "A clear path from enquiry to planning.", items };
    case "testimonials": return { heading: "Patient confidence", body: "Verified feedback belongs here when supplied by the clinic.", items };
    case "gallery": return { heading: "A closer look", body: "Authentic clinic imagery and consented case media.", items };
    case "team": return { heading: "Clinical expertise", body: "Verified clinician details belong here.", items };
    case "cta": return { heading: "Ready to discuss your treatment options?", body: "Request a consultation.", primaryAction: { label: "Request consultation", href: "#contact" } };
    case "contact": return { heading: "Book a consultation", body: "Send an enquiry and the clinic can confirm availability.", primaryAction: { label: "Send enquiry", href: "#contact-form" } };
    default: return { heading: family, body: "Premium dental care information." };
  }
}

async function installRoutes(page: Page, site: Site) {
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route) => route.fulfill({ json: { completed: true, profile } }));
  await page.route("**/api/drafts**", async (route) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "mobile-nav-user" } } }));
  await page.route("**/api/credits**", async (route) => route.fulfill({ json: { balance: 100 } }));
}
