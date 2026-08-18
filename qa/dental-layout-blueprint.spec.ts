import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { findWebsiteLayout } from "@micirql/design-engine";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { INDUSTRY_DESIGN_PRESETS } from "../apps/builder/app/industry-design-preset-data";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";

const LAYOUT_ID = "dental-01-clinical-authority";
const TARGETS = [360, 390, 430, 768, 1024, 1440] as const;
const now = new Date().toISOString();

function section(id: string, family: SectionFamily, variant: 1 | 2 | 3 | 4 | 5, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function sourceSite(): Site {
  const preset = INDUSTRY_DESIGN_PRESETS.find((item) => item.id === "dental-clinic");
  if (!preset) throw new Error("Dental design preset is missing.");
  const theme = preset.theme.family;
  const sections = [
    section("nav", "navbar", 1, theme, {
      title: "Harbor Dental Care",
      description: "Modern dentistry · Hyderabad",
      items: [{ title: "Treatments", href: "#services" }, { title: "Doctor", href: "#doctor" }, { title: "Technology", href: "#technology" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
    section("hero", "hero", 2, theme, {
      eyebrow: "Clear dental care in Hyderabad",
      title: "Clinical dentistry built around clear decisions",
      description: "Understand treatment options, meet the clinical team and request an appointment through a calm, structured patient experience.",
      image: { src: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=80", alt: "Dentist discussing treatment with a patient" },
      primaryAction: { label: "Book appointment", href: "#contact" },
      secondaryAction: { label: "Explore treatments", href: "#services" },
    }),
    section("trust", "testimonials", 3, theme, {
      eyebrow: "Why patients choose us",
      title: "Confidence before treatment begins",
      description: "Important trust information stays easy to scan before patients reach detailed treatment content.",
      items: [
        { title: "Clear planning", description: "Treatment options explained before proceeding." },
        { title: "Modern workflow", description: "A structured clinical approach from consultation onward." },
        { title: "Easy access", description: "Simple appointment and follow-up contact." },
        { title: "Patient focused", description: "Information organised around practical next steps." },
      ],
    }),
    section("services", "services", 3, theme, {
      eyebrow: "Treatments",
      title: "Dental care for the decisions patients make most often",
      description: "Explore common treatment areas and use the consultation to understand which options may be appropriate for your needs.",
      items: [
        { title: "Preventive dentistry", description: "Routine care focused on maintaining oral health and catching concerns early." },
        { title: "Restorative care", description: "Options for damaged or missing teeth discussed after clinical assessment." },
        { title: "Root canal care", description: "Assessment and treatment planning for teeth affected by pulpal or root concerns." },
        { title: "Dental implants", description: "Consultation-led replacement options for missing teeth." },
        { title: "Cosmetic dentistry", description: "Aesthetic treatment options planned around realistic goals." },
        { title: "Gum care", description: "Evaluation and ongoing care for periodontal health." },
      ],
    }),
    section("doctor", "team", 2, theme, {
      eyebrow: "Clinical team",
      title: "Meet the people guiding your care",
      description: "Verified doctor credentials and experience can be presented clearly without turning the page into a crowded profile directory.",
      items: [
        { title: "Lead Dentist", description: "Add the doctor’s verified qualification, focus areas and experience here.", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=1000&q=80" },
        { title: "Clinical support", description: "Supports appointments, treatment coordination and patient follow-up." },
        { title: "Front desk", description: "Helps patients with availability, directions and appointment questions." },
      ],
    }),
    section("technology", "features", 2, theme, {
      eyebrow: "Clinical confidence",
      title: "Technology should make treatment easier to understand",
      description: "Show only equipment and workflows the clinic actually uses, with a clear explanation of why they matter to patients.",
      items: [
        { title: "Digital assessment", description: "Use verified scanning or imaging information supplied by the clinic." },
        { title: "Structured planning", description: "Explain how findings are translated into a clear treatment sequence." },
        { title: "Patient communication", description: "Keep practical preparation and after-care guidance easy to find." },
      ],
    }),
    section("proof", "testimonials", 2, theme, {
      eyebrow: "Patient proof",
      title: "Real feedback, once verified",
      description: "The final website should publish genuine reviews supplied or approved by the clinic rather than fabricated testimonials.",
      items: [{ title: "Verified patient review", description: "Replace this certification fixture with genuine approved patient feedback before publishing." }],
    }),
    section("cta", "cta", 2, theme, {
      eyebrow: "Next step",
      title: "Ready to discuss your dental care?",
      description: "Request an appointment and the clinic can confirm timing, availability and the right consultation pathway.",
      primaryAction: { label: "Request appointment", href: "#contact" },
      secondaryAction: { label: "Call clinic", href: "tel:+910000000000" },
    }),
    section("contact", "contact", 2, theme, {
      eyebrow: "Contact",
      title: "Request an appointment",
      description: "Send your preferred contact details and the clinic can respond with available appointment options.",
      formAction: "/api/forms/appointment",
      primaryAction: { label: "Send request", href: "#contact-form" },
    }),
    section("footer", "footer", 4, theme, {
      title: "Harbor Dental Care",
      description: "Clear treatment information, verified clinical details and an easy route to an appointment.",
      items: [{ title: "Treatments", href: "#services" }, { title: "Doctor", href: "#doctor" }, { title: "Contact", href: "#contact" }],
      primaryAction: { label: "Book appointment", href: "#contact" },
    }),
  ];

  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "dental-blueprint-01",
    workspaceId: "dental-blueprint-certification",
    name: "Harbor Dental Care",
    domain: "clinic",
    subtype: "dental",
    theme: preset.theme,
    seoBlueprint: { primaryGoal: "Book dental appointments", targetLocations: ["Hyderabad"], priorityTopics: ["Dental care"], audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: "Harbor Dental Care | Hyderabad Dentist", description: "Explore dental care and request an appointment.", canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

async function installRoutes(page: any, site: Site) {
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route: any) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route: any) => route.fulfill({ json: { completed: true, profile: { industry: "dental clinic", subindustry: "general dentistry", goals: ["book appointment", "build trust"], style_tags: ["clinical", "clean"], required_capabilities: ["booking", "contact"], services: ["preventive dentistry", "restorative care", "root canal care"] } } }));
  await page.route("**/api/drafts**", async (route: any) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "blueprint-qa" } } }));
  await page.route("**/api/credits**", async (route: any) => route.fulfill({ json: { balance: 100 } }));
}

function viewportFor(width: number) {
  if (width <= 430) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

test("Dental 01 Clinical Authority passes curated responsive safety gates", async ({ page }) => {
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

  const output = path.join(process.cwd(), "test-results", "dental-layout-blueprint-01");
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
    const metrics = await document.evaluate((element) => {
      const root = element.querySelector("[data-mi-layout-blueprint]") as HTMLElement | null;
      if (!root) return { clientWidth: 0, scrollWidth: 1, overflowingSections: 1, overflowingControls: 1, clippedMedia: 1 };
      const rootRect = root.getBoundingClientRect();
      const outside = (node: Element) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1);
      };
      return {
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        overflowingSections: [...root.querySelectorAll("section,header,footer")].filter(outside).length,
        overflowingControls: [...root.querySelectorAll("a,button,input,textarea,select")].filter(outside).length,
        clippedMedia: [...root.querySelectorAll("img,video,iframe")].filter(outside).length,
      };
    });

    const passed = metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.overflowingSections === 0 && metrics.overflowingControls === 0 && metrics.clippedMedia === 0;
    expect(metrics.scrollWidth, `${width}px document overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.overflowingSections, `${width}px section overflow`).toBe(0);
    expect(metrics.overflowingControls, `${width}px control overflow`).toBe(0);
    expect(metrics.clippedMedia, `${width}px media overflow`).toBe(0);
    await document.screenshot({ path: path.join(output, `${width}.png`) });
    results.push({ width, viewport, ...metrics, passed });
  }

  await writeFile(path.join(output, "report.json"), JSON.stringify({ layoutId: LAYOUT_ID, targets: TARGETS, coverage, results }, null, 2), "utf8");
});
