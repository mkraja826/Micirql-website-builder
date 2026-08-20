import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS, type WebsiteLayoutBlueprint } from "@micirql/design-engine";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";
import { applyDentalMultipageArchitecture } from "../apps/builder/app/dental-multipage-architecture";
import { applyDentalMultipageMediaSafety } from "../apps/builder/app/dental-multipage-media-safety";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const now = new Date().toISOString();
const TREATMENT_PATH = "/treatments/dental-implants";
const TREATMENT_PAGE_ID = "treatment-implant";
const VIEWPORTS = [
  { id: "mobile-360", mode: "mobile", width: 360, height: 800 },
  { id: "mobile-390", mode: "mobile", width: 390, height: 844 },
  { id: "mobile-430", mode: "mobile", width: 430, height: 932 },
  { id: "tablet-768", mode: "tablet", width: 768, height: 1024 },
  { id: "desktop-1024", mode: "desktop", width: 1024, height: 768 },
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

const QA_HERO_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='1200' viewBox='0 0 1600 1200'%3E%3Crect width='1600' height='1200' fill='%23e4ecea'/%3E%3Ccircle cx='1180' cy='330' r='260' fill='%23c4d5d1'/%3E%3Cpath d='M0 940 C420 720 730 1130 1600 760 L1600 1200 L0 1200 Z' fill='%23d2dfdc'/%3E%3C/svg%3E";

const baseProfile: OnboardingProfile = {
  industry: "dental clinic",
  subindustry: "implant dentistry",
  goals: ["book appointments", "build trust"],
  style_tags: ["premium", "professional", "clinical"],
  required_capabilities: ["booking", "contact", "treatment process", "faq"],
  services: ["dental implants", "cosmetic dentistry", "root canal treatment"],
};

// This one evidence case intentionally captures 20 layouts x 6 viewports.
// Keep the ceiling below the workflow timeout while allowing cold CI runners
// enough room to start Next.js, switch pages and persist 120 screenshots.
test.setTimeout(1_200_000);

function buildSite(layout: WebsiteLayoutBlueprint): Site {
  const name = layout.id.replace(/^dental-\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
  const composition = composeWebsite(baseProfile, {
    selectedLayoutId: layout.id,
    selectedLayoutScore: 100,
    selectedLayoutReasons: ["Top-20 implant treatment rendered evidence"],
  });
  expect(composition.layoutCandidate?.layout.id).toBe(layout.id);
  const services = baseProfile.services ?? ["Dental implants"];
  const sections = [
    makeSection("global-navbar", "navbar", 1, composition.preset.theme.family, {
      title: name,
      items: [{ title: "Treatments" }, { title: "About" }, { title: "Contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    ...composition.sections.map((section, index) =>
      makeSection(`${section.family}-${index + 1}`, section.family, section.variant, composition.preset.theme.family, contentFor(section.family, name, services)),
    ),
    makeSection("global-footer", "footer", 1, composition.preset.theme.family, {
      title: name,
      description: "Premium dental care information with a clear route to consultation.",
      items: [{ title: "Treatments" }, { title: "Contact" }],
    }),
  ];

  const base = siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `implant-visual-${layout.id}`,
    workspaceId: "visual-dental-top20-implant",
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
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      sections,
      seo: {
        title: `${name} | Dental Care`,
        description: `Explore ${name}.`,
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: ["Organization"],
      },
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });

  const coverage = layoutCoverage(base, layout);
  expect(coverage.complete, `${layout.id} fixture does not cover the complete certified blueprint: ${coverage.missing.join(", ")}`).toBe(true);
  const productionApplied = applyWebsiteLayoutBlueprint(base, layout);
  const multipage = applyDentalMultipageArchitecture(productionApplied, baseProfile);
  expect(multipage.treatmentPages).toContain(TREATMENT_PATH);
  const mediaSafe = applyDentalMultipageMediaSafety(multipage.site);
  const implant = mediaSafe.site.pages.find((page) => page.path === TREATMENT_PATH);
  expect(implant, `${layout.id} did not produce the implant treatment page`).toBeTruthy();
  expect(implant?.id).toBe(TREATMENT_PAGE_ID);
  expect(implant?.seo.canonicalPath).toBe(TREATMENT_PATH);
  expect(implant?.sections.map((section) => section.id)).toEqual([
    "implant-nav", "implant-hero", "implant-assessment", "implant-journey", "implant-faq", "implant-cta", "implant-footer",
  ]);
  expect(implant?.sections.every((section) => section.props.layoutBlueprintId === layout.id), `${layout.id} was not inherited by every implant section`).toBe(true);
  return mediaSafe.site;
}

function makeSection(id: string, family: SectionFamily, variant: 1 | 2 | 3 | 4 | 5, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function contentFor(family: SectionFamily, name: string, services: string[]): Record<string, unknown> {
  const items = services.map((service) => ({ title: title(service), description: `Clear information about ${service.toLowerCase()}, consultation and next steps.` }));
  switch (family) {
    case "hero": return {
      eyebrow: "Premium dental care",
      title: "Clinical precision with a more considered patient experience",
      description: `${name} combines clear treatment information, thoughtful consultation and a confident modern presentation.`,
      primaryAction: { label: "Book consultation", href: "#contact" },
      secondaryAction: { label: "Explore treatments", href: "#services" },
      image: { src: QA_HERO_IMAGE, alt: "Dental consultation planning" },
      imageSlotMode: "section",
      imageRatio: "4:3",
      imageFit: "cover",
      imageFocalPoint: "center",
    };
    case "about": return { title: "Care designed around clarity and confidence", description: "Every step is presented with enough context to help patients understand what to discuss with the clinical team." };
    case "services": return { title: "Treatments", description: "Explore key services and the role each may play in a tailored treatment plan.", items };
    case "features": return { title: "Why the experience feels different", description: "A premium clinic experience should make technology, planning and patient communication easy to understand.", items: [{ title: "Clear planning", description: "Understand the sequence before treatment begins." }, { title: "Modern workflow", description: "Technology supports diagnosis, planning and communication." }, { title: "Calm guidance", description: "Questions and next steps remain easy to follow." }] };
    case "process": return { title: "Your treatment journey", description: "A clear path from enquiry to consultation and treatment planning.", items: [{ title: "01 — Enquire", description: "Share your priorities and preferred appointment details." }, { title: "02 — Consult", description: "Discuss concerns, options and suitable investigations." }, { title: "03 — Plan", description: "Review the proposed approach before proceeding." }] };
    case "team": return { title: "Clinical expertise", description: "Verified clinician details and portraits belong here when supplied by the practice.", items: [{ title: "Lead clinician", description: "Verified qualifications and experience can be presented here." }, { title: "Clinical team", description: "Show the real people supporting the patient journey." }] };
    case "gallery": return { title: "A closer look", description: "Use authentic clinic imagery and consented case media to create visual trust.", items: [] };
    case "testimonials": return { title: "Patient confidence", description: "Verified patient feedback can reinforce the experience once supplied by the clinic.", items: [] };
    case "faq": return { title: "Patient questions", items: [{ title: "What happens at a consultation?", description: "The clinical team assesses your needs and explains suitable next steps." }] };
    case "cta": return { title: "Ready to discuss your treatment options?", description: "Request a consultation and speak with the clinic about the next suitable step.", primaryAction: { label: "Request consultation", href: "#contact" } };
    case "contact": return { title: "Book a consultation", description: "Send an enquiry and the clinic can confirm timing and availability directly.", primaryAction: { label: "Send enquiry", href: "#contact-form" } };
    default: return { title: title(family), description: "Premium dental care information." };
  }
}

function title(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

async function installRoutes(page: Page, site: Site) {
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route) => route.fulfill({ json: { completed: true, profile: baseProfile } }));
  await page.route("**/api/drafts**", async (route) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "implant-visual-qa" } } }));
  await page.route("**/api/credits**", async (route) => route.fulfill({ json: { balance: 100 } }));
}

async function selectViewport(page: Page, mode: "mobile" | "tablet" | "desktop", width: number) {
  const control = page.locator(".viewport-switcher button").filter({ hasText: new RegExp(`^${mode}$`, "i") });
  await expect(control).toHaveCount(1);
  await control.evaluate((element) => (element as HTMLButtonElement).click());
  const frame = page.locator(`.site-preview.viewport-${mode}`);
  await expect(frame).toBeVisible();
  await frame.evaluate((element, targetWidth) => {
    const node = element as HTMLElement;
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

async function treatmentMetrics(preview: Locator, viewportHeight: number) {
  return preview.evaluate((element, targetViewportHeight) => {
    const root = element as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const visible = (node: HTMLElement) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const all = [...root.querySelectorAll<HTMLElement>("*")].filter(visible);
    const overflowers = all.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1;
    }).slice(0, 20).map((node) => ({ tag: node.tagName, cls: String(node.className).slice(0, 70), text: node.textContent?.trim().slice(0, 80) ?? "" }));

    const clippedText = [...root.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,li,blockquote,label,a,button,summary,span")].filter((node) => {
      if (!visible(node) || !node.textContent?.trim()) return false;
      const style = getComputedStyle(node);
      const clipsX = ["hidden", "clip"].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
      const clipsY = ["hidden", "clip"].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      return clipsX || clipsY;
    }).slice(0, 20).map((node) => ({ tag: node.tagName, cls: String(node.className).slice(0, 70), text: node.textContent?.trim().slice(0, 90) ?? "" }));

    const undersizedActions = [...root.querySelectorAll<HTMLElement>("a[href],button,summary,[role=button]")].filter((node) => {
      if (!visible(node)) return false;
      const rect = node.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).slice(0, 20).map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 70) ?? "", width: Math.round(node.getBoundingClientRect().width), height: Math.round(node.getBoundingClientRect().height) }));

    // Long FAQ summaries and navigation labels may legitimately wrap. The
    // malformed-wrap gate is intentionally limited to button-like conversion
    // controls; general text wrapping is covered by the clipping/overflow gates.
    const wrappedActions = [...root.querySelectorAll<HTMLElement>(".mi-section__action,.mi-conv-btn,.mi-shell-cta,.mi-section__form button")].filter((node) => {
      if (!visible(node) || !node.textContent?.trim()) return false;
      const range = document.createRange();
      range.selectNodeContents(node);
      return range.getClientRects().length > 1 && node.getBoundingClientRect().height > 62;
    }).slice(0, 20).map((node) => ({ tag: node.tagName, text: node.textContent?.trim().slice(0, 80) ?? "" }));

    const images = [...root.querySelectorAll<HTMLImageElement>("img")].filter(visible);
    const imageFailures = images.filter((image) => {
      const rect = image.getBoundingClientRect();
      if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) return true;
      if (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1) return true;
      const renderedRatio = rect.width / Math.max(1, rect.height);
      const naturalRatio = image.naturalWidth / image.naturalHeight;
      const objectFit = getComputedStyle(image).objectFit;
      return objectFit !== "cover" && objectFit !== "contain" && Math.abs(renderedRatio - naturalRatio) / naturalRatio > 0.12;
    }).length;

    const sections = [...root.querySelectorAll<HTMLElement>(".mi-editor-section")].filter(visible);
    const sectionRects = sections.map((section) => section.getBoundingClientRect());
    let sectionOverlapCount = 0;
    for (let index = 1; index < sectionRects.length; index += 1) {
      if (sectionRects[index]!.top < sectionRects[index - 1]!.bottom - 2) sectionOverlapCount += 1;
    }
    const oversizedSectionCount = sectionRects.filter((rect, index) => index > 1 && index < sectionRects.length - 1 && rect.height > targetViewportHeight * 2.35).length;

    const breadcrumb = root.querySelector<HTMLElement>('.mi-breadcrumbs[aria-label="Breadcrumb"]');
    const breadcrumbCurrent = breadcrumb?.querySelector<HTMLElement>('[aria-current="page"]')?.textContent?.trim() ?? "";
    const hero = root.querySelector<HTMLElement>('[data-mi-section-id="implant-hero"]');
    const heroHeading = hero?.querySelector<HTMLElement>("h1");
    const heroPrimary = hero?.querySelector<HTMLAnchorElement>('a[href="/contact"]');
    const heroSecondary = hero?.querySelector<HTMLAnchorElement>('a[href="/#treatments"]');
    const faq = root.querySelector<HTMLElement>('[data-mi-section-id="implant-faq"]');
    const faqItems = faq ? faq.querySelectorAll("details.mi-faq-item").length : 0;
    const finalCta = root.querySelector<HTMLElement>('[data-mi-section-id="implant-cta"]');
    const finalCtaHref = finalCta?.querySelector<HTMLAnchorElement>('a[href="/contact"]')?.getAttribute("href") ?? "";
    const placeholderCount = hero?.querySelectorAll(".mi-image-slot-placeholder").length ?? 0;

    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      overflowCount: overflowers.length,
      overflowers,
      clippedTextCount: clippedText.length,
      clippedText,
      undersizedActionCount: undersizedActions.length,
      undersizedActions,
      wrappedActionCount: wrappedActions.length,
      wrappedActions,
      imageFailureCount: imageFailures,
      imageCount: images.length,
      sectionOverlapCount,
      oversizedSectionCount,
      breadcrumbCount: breadcrumb ? 1 : 0,
      breadcrumbCurrent,
      heroHeadingVisible: Boolean(heroHeading && visible(heroHeading)),
      heroPrimaryHref: heroPrimary?.getAttribute("href") ?? "",
      heroSecondaryHref: heroSecondary?.getAttribute("href") ?? "",
      faqItemCount: faqItems,
      finalCtaHref,
      placeholderCount,
    };
  }, viewportHeight);
}

test("render Dental Implants across all 20 certified layouts and six production viewports", async ({ page }) => {
  const outputDirectory = path.join(process.cwd(), "test-results", "dental-top20-implant-treatment-visual-evidence");
  await mkdir(outputDirectory, { recursive: true });
  const report: Array<Record<string, unknown>> = [];
  expect(DENTAL_LAYOUT_BLUEPRINTS).toHaveLength(20);

  for (const layout of DENTAL_LAYOUT_BLUEPRINTS) {
    await page.unrouteAll({ behavior: "wait" });
    await page.setViewportSize({ width: 1800, height: 1100 });
    const site = buildSite(layout);
    await installRoutes(page, site);
    await page.addInitScript(() => localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "implant-visual-token", refresh_token: "implant-visual-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: "implant-visual-user", email: "visual@micirql.test" } })));
    await page.goto("/");
    await page.getByRole("button", { name: "Open editor" }).first().click();
    await expect(page.getByText(site.name).first()).toBeVisible();

    const implantPageButton = page.locator(".page-switcher button").filter({ hasText: /^Dental Implants$/ });
    await expect(implantPageButton).toHaveCount(1);
    await implantPageButton.click();
    const preview = page.locator(`.renderer-preview-document[data-mi-page="${TREATMENT_PAGE_ID}"]`);
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("data-mi-layout-blueprint", layout.id);
    await expect(preview).toHaveAttribute("data-mi-layout-archetype", /.+/);
    await expect(preview.getByRole("heading", { level: 1, name: /Dental implant care begins with careful assessment and planning/i })).toBeVisible();
    await page.addStyleTag({ content: CAPTURE_STYLES });

    const viewportResults: Record<string, unknown> = {};
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const frame = await selectViewport(page, viewport.mode, viewport.width);
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const measured = await treatmentMetrics(preview, viewport.height);

      expect(measured.scrollWidth, `${layout.id} implant page overflowed at ${viewport.width}px`).toBeLessThanOrEqual(measured.clientWidth + 1);
      expect(measured.overflowCount, `${layout.id} implant page has child escape at ${viewport.width}px: ${JSON.stringify(measured.overflowers)}`).toBe(0);
      expect(measured.clippedTextCount, `${layout.id} implant page has clipped text at ${viewport.width}px: ${JSON.stringify(measured.clippedText)}`).toBe(0);
      expect(measured.wrappedActionCount, `${layout.id} implant page has malformed wrapped controls at ${viewport.width}px: ${JSON.stringify(measured.wrappedActions)}`).toBe(0);
      expect(measured.imageFailureCount, `${layout.id} implant page has failed/distorted/out-of-bounds images at ${viewport.width}px`).toBe(0);
      expect(measured.sectionOverlapCount, `${layout.id} implant page has overlapping page sections at ${viewport.width}px`).toBe(0);
      expect(measured.placeholderCount, `${layout.id} implant hero leaked an empty media placeholder`).toBe(0);
      expect(measured.breadcrumbCount).toBe(1);
      expect(measured.breadcrumbCurrent).toBe("Dental Implants");
      expect(measured.heroHeadingVisible).toBe(true);
      expect(measured.heroPrimaryHref).toBe("/contact");
      expect(measured.heroSecondaryHref).toBe("/#treatments");
      expect(measured.faqItemCount).toBe(3);
      expect(measured.finalCtaHref).toBe("/contact");
      if (viewport.width <= 430) {
        expect(measured.undersizedActionCount, `${layout.id} implant page has touch targets below 44px at ${viewport.width}px: ${JSON.stringify(measured.undersizedActions)}`).toBe(0);
        expect(measured.oversizedSectionCount, `${layout.id} implant page has abnormally tall mobile sections at ${viewport.width}px`).toBe(0);
      }

      await capture(page, frame, path.join(outputDirectory, `${layout.id}--implant--${viewport.id}.png`));
      viewportResults[viewport.id] = measured;
    }

    report.push({ layoutId: layout.id, layoutName: layout.name, treatmentPath: TREATMENT_PATH, viewports: viewportResults });
  }

  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    contract: "dental-top20-implant-treatment-six-viewport-v1",
    treatmentPath: TREATMENT_PATH,
    layouts: report.length,
    viewports: VIEWPORTS,
    report,
  }, null, 2), "utf8");

  await writeFile(path.join(outputDirectory, "summary.md"), [
    "# MiCirql Dental Implants Top-20 Treatment-Page Visual Evidence",
    "",
    `- Treatment path: **${TREATMENT_PATH}**`,
    `- Layouts captured: **${report.length}/20**`,
    `- Viewports per layout: **${VIEWPORTS.length}**`,
    `- Total screenshots: **${report.length * VIEWPORTS.length}**`,
    "- Hard gates: exact certified blueprint identity, no document overflow, no child escape, no clipped text, no malformed/wrapped actions, no failed/distorted/out-of-bounds imagery, no section overlaps, no empty hero placeholder, exact breadcrumb current page, correct consultation/treatment links, three FAQ disclosures, mobile touch targets >=44px and no abnormally tall content sections",
    "",
    ...report.map((entry) => `- ${entry.layoutId}: PASS`),
    "",
  ].join("\n"), "utf8");
});
