import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { findWebsiteLayout } from "@micirql/design-engine";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";

const LAYOUT_ID = "dental-02-implant-luxury";
const TARGETS = [360, 390, 430, 768, 1024, 1440] as const;
const now = new Date().toISOString();

function section(id: string, family: SectionFamily, variant: 1 | 2 | 3 | 4 | 5, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "premium-implant-clinic");
  if (!preset) throw new Error("Premium Implant Clinic preset is missing.");
  const theme = preset.theme.family;
  const sections = [
    section("nav", "navbar", 1, theme, {
      title: "Atelier Implant Centre",
      description: "Implant dentistry · Hyderabad",
      items: [{ title: "Implants", href: "#services" }, { title: "Doctor", href: "#doctor" }, { title: "Process", href: "#process" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Private consultation", href: "#contact" },
    }),
    section("hero", "hero", 1, theme, {
      eyebrow: "Advanced implant dentistry",
      title: "Implant care shaped around precision and confidence",
      description: "A specialist-led consultation experience for patients considering single implants, full-arch rehabilitation and complex restorative planning.",
      image: { src: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1600&q=80", alt: "Dental clinician preparing for an implant consultation" },
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Explore implant care", href: "#services" },
    }),
    section("doctor", "team", 1, theme, {
      eyebrow: "Clinical leadership",
      title: "A consultation led by expertise",
      description: "Verified qualifications, implant focus areas and clinical experience belong here once supplied by the practice.",
      items: [
        { title: "Implant clinician", description: "Present verified training, treatment focus and experience without unsupported claims.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1200&q=80" },
        { title: "Treatment planning", description: "Structured assessment and discussion before treatment decisions are made." },
        { title: "Patient coordination", description: "Clear appointment, preparation and follow-up communication." },
      ],
    }),
    section("services", "services", 1, theme, {
      eyebrow: "Implant treatments",
      title: "Focused options for replacing missing teeth",
      description: "Use consultation and clinical assessment to understand which implant pathway may be relevant to your situation.",
      items: [
        { title: "Single-tooth implants", description: "A consultation-led option for an individual missing tooth." },
        { title: "Implant-supported bridges", description: "Planning for several missing teeth where an implant-supported restoration may be considered." },
        { title: "Full-arch rehabilitation", description: "Complex treatment planning for patients exploring fixed full-arch replacement options." },
        { title: "Implant restoration", description: "Assessment of implant crowns and restorative components." },
      ],
    }),
    section("technology", "features", 1, theme, {
      eyebrow: "Planning confidence",
      title: "Technology used to support clearer decisions",
      description: "Publish only scanning, imaging and planning tools that the clinic has verified it uses.",
      items: [
        { title: "Digital assessment", description: "Explain verified diagnostic workflows in patient-friendly language." },
        { title: "Treatment visualisation", description: "Use verified planning information to help patients understand proposed next steps." },
        { title: "Restorative coordination", description: "Present the clinical workflow from implant planning through restoration." },
      ],
    }),
    section("process", "process", 1, theme, {
      eyebrow: "The implant journey",
      title: "A measured path from consultation to restoration",
      description: "Keep the treatment journey sequential and easy to scan on every screen size.",
      items: [
        { title: "Consultation", description: "Discuss concerns, goals, history and the assessment required before treatment planning." },
        { title: "Clinical planning", description: "Review findings and the proposed treatment sequence with the clinician." },
        { title: "Treatment", description: "Proceed only after the clinic has explained the agreed clinical plan and practical requirements." },
        { title: "Restoration and review", description: "Complete the restorative phase and follow the clinic’s review schedule." },
      ],
    }),
    section("proof", "testimonials", 1, theme, {
      eyebrow: "Patient experience",
      title: "Confidence should come from verified experience",
      description: "Only genuine, approved patient feedback should appear on the published site.",
      items: [{ title: "Verified implant patient", description: "Replace this QA fixture with a genuine approved patient review before publishing." }],
    }),
    section("cta", "cta", 1, theme, {
      eyebrow: "Private consultation",
      title: "Discuss your implant options with the clinical team",
      description: "Request a consultation and the clinic can confirm availability and the appropriate assessment pathway.",
      primaryAction: { label: "Request consultation", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", 1, theme, {
      eyebrow: "Contact",
      title: "Request an implant consultation",
      description: "Send your details and the clinic can respond with available consultation times and preparation information.",
      formAction: "/api/forms/implant-consultation",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", 1, theme, {
      title: "Atelier Implant Centre",
      description: "Specialist-led implant consultations presented with clarity, restraint and verified clinical information.",
      items: [{ title: "Implants", href: "#services" }, { title: "Doctor", href: "#doctor" }, { title: "Process", href: "#process" }, { title: "Contact", href: "#contact" }],
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-02",
    workspaceId: "dental-blueprint-certification",
    name: "Atelier Implant Centre",
    domain: "clinic",
    subtype: "dental",
    theme: preset.theme,
    seoBlueprint: { primaryGoal: "Book implant consultations", targetLocations: ["Hyderabad"], priorityTopics: ["Dental implants", "Implant consultation"], audiences: ["Implant patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Atelier Implant Centre | Implant Dentistry", description: "Explore implant consultation pathways and request an appointment.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

async function installRoutes(page: any, site: Site) {
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route: any) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route: any) => route.fulfill({ json: { completed: true, profile: { industry: "dental clinic", subindustry: "implant dentistry", goals: ["implant consultation", "high-value treatment lead"], style_tags: ["implant", "luxury", "editorial", "premium"], required_capabilities: ["booking", "contact", "treatment process"], services: ["single-tooth implants", "implant-supported bridges", "full-arch rehabilitation"] } } }));
  await page.route("**/api/drafts**", async (route: any) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "blueprint-qa" } } }));
  await page.route("**/api/credits**", async (route: any) => route.fulfill({ json: { balance: 100 } }));
}

function viewportFor(width: number) {
  if (width <= 430) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

test("Dental 02 Implant Atelier passes curated responsive safety gates", async ({ page }) => {
  const layout = findWebsiteLayout(LAYOUT_ID);
  if (!layout) throw new Error(`${LAYOUT_ID} is missing from the layout library.`);
  const source = sourceSite();
  const coverage = layoutCoverage(source, layout);
  expect(coverage.complete, `Missing blueprint sections: ${coverage.missing.join(", ")}`).toBeTruthy();
  const site = applyWebsiteLayoutBlueprint(source, layout);
  await installRoutes(page, site);
  await page.addInitScript(() => localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "blueprint-token", refresh_token: "blueprint-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: "blueprint-user", email: "blueprint@micirql.test" } })));
  await page.goto("/");
  await page.getByRole("button", { name: "Open editor" }).first().click();

  const output = path.join(process.cwd(), "test-results", "dental-layout-blueprint-02");
  await mkdir(output, { recursive: true });
  const results: Array<Record<string, unknown>> = [];

  for (const width of TARGETS) {
    const viewport = viewportFor(width);
    await page.getByRole("button", { name: viewport, exact: true }).click();
    const sitePreview = page.locator(`.site-preview.viewport-${viewport}`);
    await expect(sitePreview).toBeVisible();
    await sitePreview.evaluate((element, targetWidth) => {
      (element as HTMLElement).style.setProperty("width", `${targetWidth}px`, "important");
      (element as HTMLElement).style.setProperty("max-width", `${targetWidth}px`, "important");
    }, width);

    const document = page.locator(".renderer-preview-document");
    await expect(document.locator(`[data-mi-layout-blueprint="${LAYOUT_ID}"]`)).toHaveCount(1);
    const metrics = await document.evaluate((element, targetWidth) => {
      const root = element.querySelector("[data-mi-layout-blueprint]") as HTMLElement | null;
      if (!root) return { clientWidth: 0, scrollWidth: 1, overflowingSections: 1, overflowingControls: 1, clippedMedia: 1, mobileHeroSeparated: false };
      const rootRect = root.getBoundingClientRect();
      const outside = (node: Element) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1);
      };
      const hero = root.querySelector(".mi-hero--immersive") as HTMLElement | null;
      const media = hero?.querySelector(":scope > .mi-section__media") as HTMLElement | null;
      const overlay = hero?.querySelector(".mi-hero__overlay") as HTMLElement | null;
      let mobileHeroSeparated = true;
      if (targetWidth <= 430 && hero && media && overlay) {
        const mediaRect = media.getBoundingClientRect();
        const overlayRect = overlay.getBoundingClientRect();
        const mediaPosition = getComputedStyle(media).position;
        const overlayPosition = getComputedStyle(overlay).position;
        mobileHeroSeparated = mediaPosition === "relative" && overlayPosition === "relative" && overlayRect.top >= mediaRect.bottom - 2;
      }
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        overflowingSections: [...root.querySelectorAll("section,header,footer")].filter(outside).length,
        overflowingControls: [...root.querySelectorAll("a,button,input,textarea,select")].filter(outside).length,
        clippedMedia: [...root.querySelectorAll("img,video,iframe")].filter(outside).length,
        mobileHeroSeparated,
      };
    }, width);

    const passed = metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.overflowingSections === 0 && metrics.overflowingControls === 0 && metrics.clippedMedia === 0 && metrics.mobileHeroSeparated;
    expect(metrics.scrollWidth, `${width}px document overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.overflowingSections, `${width}px section overflow`).toBe(0);
    expect(metrics.overflowingControls, `${width}px control overflow`).toBe(0);
    expect(metrics.clippedMedia, `${width}px media overflow`).toBe(0);
    expect(metrics.mobileHeroSeparated, `${width}px mobile hero must use image and copy as separate normal-flow regions`).toBeTruthy();
    await document.screenshot({ path: path.join(output, `${width}.png`) });
    results.push({ width, viewport, ...metrics, passed });
  }

  await writeFile(path.join(output, "report.json"), JSON.stringify({ layoutId: LAYOUT_ID, targets: TARGETS, coverage, results }, null, 2), "utf8");
});
