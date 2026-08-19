import { mkdir } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS, type WebsiteLayoutBlueprint } from "@micirql/design-engine";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const now = new Date().toISOString();
const OUTPUT = path.join(process.cwd(), "qa-artifacts", "dental-flagship-evidence");
const FLAGSHIP_IDS = [
  "dental-01-clinical-authority",
  "dental-02-implant-luxury",
  "dental-03-smile-studio",
  "dental-05-digital-dentistry",
  "dental-08-boutique-cosmetic",
] as const;
const VIEWPORTS = [
  { id: "mobile-360", mode: "mobile", width: 360, height: 800 },
  { id: "mobile-390", mode: "mobile", width: 390, height: 844 },
  { id: "mobile-430", mode: "mobile", width: 430, height: 932 },
  { id: "tablet-768", mode: "tablet", width: 768, height: 1024 },
  { id: "desktop-1440", mode: "desktop", width: 1440, height: 900 },
] as const;

const profile: OnboardingProfile = {
  industry: "dental clinic",
  subindustry: "general dentistry",
  goals: ["book appointments", "build trust"],
  style_tags: ["premium", "professional"],
  required_capabilities: ["booking", "contact", "team", "gallery", "treatment process"],
  services: ["dental implants", "cosmetic dentistry", "root canal treatment"],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("micirql.supabase.session", JSON.stringify({
      access_token: "flagship-visual-token",
      refresh_token: "flagship-visual-refresh",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "flagship-visual-user", email: "visual@micirql.test" },
    }));
  });
});

for (const layoutId of FLAGSHIP_IDS) {
  test(`${layoutId} renders safely across flagship viewport matrix`, async ({ page }) => {
    const layout = DENTAL_LAYOUT_BLUEPRINTS.find((candidate) => candidate.id === layoutId);
    expect(layout, `${layoutId} must remain certified`).toBeTruthy();
    const site = buildSite(layout!);
    await installRoutes(page, site);
    await page.goto("/");
    await page.getByRole("button", { name: "Open editor" }).first().click();
    await expect(page.locator(".renderer-preview-document")).toBeVisible();

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: Math.max(viewport.width + 80, 440), height: viewport.height });
      const control = page.locator(".viewport-switcher button").filter({ hasText: new RegExp(`^${viewport.mode}$`, "i") });
      await expect(control).toHaveCount(1);
      await control.click();
      const preview = page.locator(`.site-preview.viewport-${viewport.mode}`);
      await expect(preview).toBeVisible();
      await preview.evaluate((node, width) => {
        const element = node as HTMLElement;
        element.style.setProperty("width", `${width}px`, "important");
        element.style.setProperty("max-width", `${width}px`, "important");
      }, viewport.width);

      const result = await preview.evaluate((rootNode) => {
        const root = rootNode as HTMLElement;
        const rootRect = root.getBoundingClientRect();
        const nodes = [...root.querySelectorAll<HTMLElement>("*")];
        const overflow = nodes.filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1);
        }).slice(0, 12).map((node) => ({ tag: node.tagName, cls: String(node.className).slice(0, 100), text: node.textContent?.trim().slice(0, 80) ?? "" }));
        const clipped = nodes.filter((node) => {
          const text = node.textContent?.trim();
          if (!text || !/^(H1|H2|H3|P|A|BUTTON|LABEL|BLOCKQUOTE)$/.test(node.tagName)) return false;
          const style = getComputedStyle(node);
          const clipsX = ["hidden", "clip"].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
          const clipsY = ["hidden", "clip"].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
          return clipsX || clipsY;
        }).slice(0, 12).map((node) => ({ tag: node.tagName, cls: String(node.className).slice(0, 100), text: node.textContent?.trim().slice(0, 80) ?? "" }));
        const shortTouchTargets = nodes.filter((node) => /^(A|BUTTON)$/.test(node.tagName)).filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.height < 44;
        }).slice(0, 12).map((node) => ({ tag: node.tagName, cls: String(node.className).slice(0, 100), text: node.textContent?.trim().slice(0, 80) ?? "", height: Math.round(node.getBoundingClientRect().height) }));
        return { overflow, clipped, shortTouchTargets, scrollWidth: root.scrollWidth, clientWidth: root.clientWidth };
      });

      expect(result.scrollWidth, `${layoutId} ${viewport.id} document overflow`).toBeLessThanOrEqual(result.clientWidth + 1);
      expect(result.overflow, `${layoutId} ${viewport.id} escaped preview bounds`).toEqual([]);
      expect(result.clipped, `${layoutId} ${viewport.id} clipped readable text`).toEqual([]);
      if (viewport.mode === "mobile") expect(result.shortTouchTargets, `${layoutId} ${viewport.id} touch targets under 44px`).toEqual([]);

      const folder = path.join(OUTPUT, layoutId);
      await mkdir(folder, { recursive: true });
      await preview.screenshot({ path: path.join(folder, `${viewport.id}.png`), animations: "disabled" });
    }
  });
}

function buildSite(layout: WebsiteLayoutBlueprint): Site {
  const name = layout.id.replace(/^dental-\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase());
  const composition = composeWebsite(profile, {
    selectedLayoutId: layout.id,
    selectedLayoutScore: 100,
    selectedLayoutReasons: ["Flagship premium visual evidence"],
  });
  expect(composition.layoutCandidate?.layout.id).toBe(layout.id);
  const sections = [
    makeSection("global-navbar", "navbar", 1, composition.preset.theme.family, {
      title: name,
      items: [{ title: "Treatments" }, { title: "About" }, { title: "Contact" }],
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
      description: "Premium dental care with clear consultation pathways.",
      items: [{ title: "Treatments" }, { title: "Contact" }],
    }),
  ];
  const base = siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `flagship-${layout.id}`,
    workspaceId: "flagship-visual-workspace",
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
  const services = ["Dental implants", "Cosmetic dentistry", "Root canal treatment"];
  const items = services.map((title) => ({ title, description: `${title} information, consultation context and next steps.` }));
  switch (family) {
    case "hero": return { eyebrow: "Premium dental care", heading: "Clinical precision with a more considered patient experience", body: `${name} presents modern dentistry with clarity, confidence and thoughtful consultation.`, primaryAction: { label: "Book consultation", href: "#contact" }, secondaryAction: { label: "Explore treatments", href: "#services" } };
    case "about": return { heading: "Care designed around clarity and confidence", body: "Understand the clinic, the treatment journey and the next appropriate conversation." };
    case "services": return { heading: "Treatments", body: "Explore key services and the role each may play in a tailored plan.", items };
    case "features": return { heading: "Why the experience feels different", body: "Technology, planning and communication should be easy to understand.", items };
    case "process": return { heading: "Your treatment journey", body: "A clear path from enquiry to consultation and planning.", items: [{ title: "01 — Enquire", description: "Share your priorities." }, { title: "02 — Consult", description: "Discuss options and investigations." }, { title: "03 — Plan", description: "Review the proposed approach." }] };
    case "testimonials": return { heading: "Patient confidence", body: "Verified feedback belongs here when supplied by the clinic.", items: [{ title: "Verified patient review", description: "Replace with approved feedback." }, { title: "Verified patient review", description: "Replace with approved feedback." }] };
    case "gallery": return { heading: "A closer look", body: "Authentic clinic imagery and consented case media build visual trust.", items };
    case "team": return { heading: "Clinical expertise", body: "Verified clinician details and portraits belong here.", items: [{ title: "Lead clinician", description: "Verified qualifications and experience." }, { title: "Clinical team", description: "The people supporting the patient journey." }] };
    case "cta": return { heading: "Ready to discuss your treatment options?", body: "Request a consultation and speak with the clinic about the next suitable step.", primaryAction: { label: "Request consultation", href: "#contact" } };
    case "contact": return { heading: "Book a consultation", body: "Send an enquiry and the clinic can confirm availability directly.", primaryAction: { label: "Send enquiry", href: "#contact-form" } };
    default: return { heading: family, body: "Premium dental care information." };
  }
}

async function installRoutes(page: Page, site: Site) {
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route) => route.fulfill({ json: { completed: true, profile } }));
  await page.route("**/api/drafts**", async (route) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "flagship-visual-user" } } }));
  await page.route("**/api/credits**", async (route) => route.fulfill({ json: { balance: 100 } }));
}
