import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS } from "@micirql/design-engine";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const now = new Date().toISOString();
const VIEWPORTS = [
  { id: "mobile-360", mode: "mobile", width: 360, height: 800 },
  { id: "mobile-390", mode: "mobile", width: 390, height: 844 },
  { id: "mobile-430", mode: "mobile", width: 430, height: 932 },
  { id: "tablet-768", mode: "tablet", width: 768, height: 1024 },
  { id: "desktop-1440", mode: "desktop", width: 1440, height: 900 },
] as const;

const CAPTURE_CLASS = "mi-qa-capture";
const CAPTURE_STYLES = `
html.${CAPTURE_CLASS} body *:not(.site-preview):not(.site-preview *){visibility:hidden!important;pointer-events:none!important}
html.${CAPTURE_CLASS} .site-preview,html.${CAPTURE_CLASS} .site-preview *{visibility:visible!important}
html.${CAPTURE_CLASS} .site-preview{position:relative!important;z-index:2147483647!important;margin:0!important}
html.${CAPTURE_CLASS} .renderer-preview-document{background:var(--mi-background,#fff)!important}
html.${CAPTURE_CLASS} [data-mi-canvas-action],html.${CAPTURE_CLASS} .mi-editor-insert-zone,html.${CAPTURE_CLASS} .mi-editor-canvas-toolbar,html.${CAPTURE_CLASS} .renderer-preview-warning{display:none!important}
html.${CAPTURE_CLASS} .mi-editor-section{outline:none!important;box-shadow:none!important}
`;

const baseProfile: OnboardingProfile = {
  industry: "dental clinic",
  subindustry: "general dentistry",
  goals: ["book appointments", "build trust"],
  style_tags: ["premium", "professional"],
  required_capabilities: ["booking", "contact", "team", "gallery", "treatment process"],
  services: ["dental implants", "cosmetic dentistry", "root canal treatment"],
};

function buildSite(layoutId: string): Site {
  const name = layoutId.replace(/^dental-\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const composition = composeWebsite(baseProfile, {
    selectedLayoutId: layoutId,
    selectedLayoutScore: 100,
    selectedLayoutReasons: ["Top-20 direct visual evidence"],
  });
  expect(composition.layoutCandidate?.layout.id).toBe(layoutId);
  const services = baseProfile.services ?? ["Dental care"];
  const sections = [
    makeSection("global-navbar", "navbar", 1, composition.preset.theme.family, {
      title: name,
      items: [{ title: "Services" }, { title: "About" }, { title: "Contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    ...composition.sections.map((section, index) =>
      makeSection(`${section.family}-${index + 1}`, section.family, section.variant, composition.preset.theme.family, contentFor(section.family, name, services)),
    ),
    makeSection("global-footer", "footer", 1, composition.preset.theme.family, {
      title: name,
      description: "Premium dental care information with a clear route to consultation.",
      items: [{ title: "Services" }, { title: "Contact" }],
    }),
  ];
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `visual-${layoutId}`,
    workspaceId: "visual-dental-top20",
    name,
    domain: "clinic",
    subtype: "dental",
    theme: composition.preset.theme,
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: services,
      audiences: ["Dental patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: `${name} | Dental Care`, description: `Explore ${name}.`, canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
  });
}

function makeSection(id: string, family: SectionFamily, variant: 1|2|3|4|5, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function contentFor(family: SectionFamily, name: string, services: string[]): Record<string, unknown> {
  const items = services.map((service) => ({ title: title(service), description: `Clear information about ${service.toLowerCase()}, consultation and next steps.` }));
  switch (family) {
    case "hero": return { eyebrow: "Premium dental care", heading: "Clinical precision with a more considered patient experience", body: `${name} combines clear treatment information, thoughtful consultation and a confident modern presentation.`, primaryAction: { label: "Book consultation", href: "#contact" }, secondaryAction: { label: "Explore treatments", href: "#services" } };
    case "about": return { heading: "Care designed around clarity and confidence", body: "Every step is presented with enough context to help patients understand what to discuss with the clinical team." };
    case "services": return { heading: "Treatments", body: "Explore key services and the role each may play in a tailored treatment plan.", items };
    case "features": return { heading: "Why the experience feels different", body: "A premium clinic experience should make technology, planning and patient communication easy to understand.", items: [{ title: "Clear planning", description: "Understand the sequence before treatment begins." }, { title: "Modern workflow", description: "Technology supports diagnosis, planning and communication." }, { title: "Calm guidance", description: "Questions and next steps remain easy to follow." }] };
    case "process": return { heading: "Your treatment journey", body: "A clear path from enquiry to consultation and treatment planning.", items: [{ title: "01 — Enquire", description: "Share your priorities and preferred appointment details." }, { title: "02 — Consult", description: "Discuss concerns, options and suitable investigations." }, { title: "03 — Plan", description: "Review the proposed approach before proceeding." }] };
    case "team": return { heading: "Clinical expertise", body: "Verified clinician details and portraits belong here when supplied by the practice.", items: [{ title: "Lead clinician", description: "Verified qualifications and experience can be presented here." }, { title: "Clinical team", description: "Show the real people supporting the patient journey." }] };
    case "gallery": return { heading: "A closer look", body: "Use authentic clinic imagery and consented case media to create visual trust.", items: [{ title: "Clinic", description: "Authentic environment photography." }, { title: "Technology", description: "Verified equipment and workflow imagery." }, { title: "Results", description: "Consented outcome photography only." }] };
    case "testimonials": return { heading: "Patient confidence", body: "Verified patient feedback can reinforce the experience once supplied by the clinic.", items: [{ title: "Verified patient review", description: "Replace with genuine approved feedback." }] };
    case "cta": return { heading: "Ready to discuss your treatment options?", body: "Request a consultation and speak with the clinic about the next suitable step.", primaryAction: { label: "Request consultation", href: "#contact" } };
    case "contact": return { heading: "Book a consultation", body: "Send an enquiry and the clinic can confirm timing and availability directly.", primaryAction: { label: "Send enquiry", href: "#contact-form" } };
    default: return { heading: title(family), body: "Premium dental care information." };
  }
}

function title(value: string) { return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()); }

async function installRoutes(page: Page, site: Site) {
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route) => route.fulfill({ json: { completed: true, profile: baseProfile } }));
  await page.route("**/api/drafts**", async (route) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "visual-qa" } } }));
  await page.route("**/api/credits**", async (route) => route.fulfill({ json: { balance: 100 } }));
}

async function selectViewport(page: Page, mode: "mobile"|"tablet"|"desktop", width: number) {
  const control = page.locator(".viewport-switcher button").filter({ hasText: new RegExp(`^${mode}$`, "i") });
  await expect(control).toHaveCount(1);
  await control.evaluate((el) => (el as HTMLButtonElement).click());
  const frame = page.locator(`.site-preview.viewport-${mode}`);
  await expect(frame).toBeVisible();
  await frame.evaluate((el, targetWidth) => {
    const node = el as HTMLElement;
    node.style.setProperty("width", `${targetWidth}px`, "important");
    node.style.setProperty("max-width", `${targetWidth}px`, "important");
  }, width);
  return frame;
}

async function capture(page: Page, target: Locator, filePath: string) {
  await page.evaluate((captureClass) => document.documentElement.classList.add(captureClass), CAPTURE_CLASS);
  try { await target.screenshot({ path: filePath }); }
  finally { await page.evaluate((captureClass) => document.documentElement.classList.remove(captureClass), CAPTURE_CLASS); }
}

async function metrics(preview: Locator) {
  return preview.evaluate((element) => {
    const root = element as HTMLElement;
    const rect = root.getBoundingClientRect();
    const all = [...root.querySelectorAll<HTMLElement>("*")];
    const overflowers = all.filter((node) => {
      const r = node.getBoundingClientRect();
      return r.width > 0 && (r.left < rect.left - 1 || r.right > rect.right + 1);
    }).slice(0, 20).map((node) => ({ tag: node.tagName, cls: node.className, text: node.textContent?.trim().slice(0,80) ?? "" }));
    const tooSmallActions = all.filter((node) => /^(A|BUTTON)$/.test(node.tagName)).map((node) => node.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0 && r.height < 44).length;
    return { scrollWidth: root.scrollWidth, clientWidth: root.clientWidth, overflowCount: overflowers.length, overflowers, tooSmallActions };
  });
}

test("capture all 20 certified Dental layouts across the premium viewport matrix", async ({ page }) => {
  const outputDirectory = path.join(process.cwd(), "test-results", "dental-top20-visual-evidence");
  await mkdir(outputDirectory, { recursive: true });
  const report: Array<Record<string, unknown>> = [];
  expect(DENTAL_LAYOUT_BLUEPRINTS).toHaveLength(20);

  for (const layout of DENTAL_LAYOUT_BLUEPRINTS) {
    await page.unrouteAll({ behavior: "wait" });
    await page.setViewportSize({ width: 1800, height: 1100 });
    const site = buildSite(layout.id);
    await installRoutes(page, site);
    await page.addInitScript(() => localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "visual-token", refresh_token: "visual-refresh", expires_in: 3600, expires_at: Math.floor(Date.now()/1000)+3600, token_type: "bearer", user: { id: "visual-user", email: "visual@micirql.test" } })));
    await page.goto("/");
    await page.getByRole("button", { name: "Open editor" }).first().click();
    await expect(page.getByText(site.name).first()).toBeVisible();
    await page.addStyleTag({ content: CAPTURE_STYLES });
    const preview = page.locator(".renderer-preview-document");
    await expect(preview).toBeVisible();

    const viewportResults: Record<string, unknown> = {};
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const frame = await selectViewport(page, viewport.mode, viewport.width);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const measured = await metrics(preview);
      expect(measured.scrollWidth, `${layout.id} overflowed at ${viewport.width}px`).toBeLessThanOrEqual(measured.clientWidth + 1);
      expect(measured.overflowCount, `${layout.id} has children escaping the preview at ${viewport.width}px: ${JSON.stringify(measured.overflowers)}`).toBe(0);
      if (viewport.width <= 430) expect(measured.tooSmallActions, `${layout.id} has touch targets under 44px at ${viewport.width}px`).toBe(0);
      await capture(page, frame, path.join(outputDirectory, `${layout.id}--${viewport.id}.png`));
      viewportResults[viewport.id] = measured;
    }
    report.push({ layoutId: layout.id, layoutName: layout.name, viewports: viewportResults });
  }

  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), layouts: report.length, viewports: VIEWPORTS, report }, null, 2), "utf8");
  await writeFile(path.join(outputDirectory, "summary.md"), [
    "# MiCirql Dental Top-20 Visual Evidence",
    "",
    `- Layouts captured: **${report.length}/20**`,
    `- Viewports per layout: **${VIEWPORTS.length}**`,
    `- Total screenshots: **${report.length * VIEWPORTS.length}**`,
    "- Hard gates: no document overflow, no child escape, mobile interactive height >= 44px",
    "",
    ...report.map((entry) => `- ${entry.layoutId}: PASS`),
    "",
  ].join("\n"), "utf8");
});
