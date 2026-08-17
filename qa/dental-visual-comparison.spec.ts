import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const now = new Date().toISOString();
const scenarios: Array<{ id: string; name: string; profile: OnboardingProfile }> = [
  { id: "general", name: "Harbor Dental Care", profile: { industry: "dental clinic", subindustry: "general dentistry", goals: ["book appointments", "build trust"], style_tags: ["clean", "professional"], required_capabilities: ["booking", "contact"], services: ["checkups", "root canal", "crowns"] } },
  { id: "implants", name: "Apex Implant Centre", profile: { industry: "dental clinic", subindustry: "implant dentistry", goals: ["book implant consultations", "build credibility"], style_tags: ["premium", "elegant"], required_capabilities: ["booking", "before after gallery"], services: ["dental implants", "full arch implants", "implant crowns"] } },
  { id: "cosmetic", name: "Ivory Smile Studio", profile: { industry: "dental clinic", subindustry: "cosmetic dentistry", goals: ["showcase smile transformations", "book consultations"], style_tags: ["premium", "visual"], required_capabilities: ["gallery", "booking"], services: ["veneers", "smile design", "teeth whitening"] } },
  { id: "orthodontic", name: "Align Dental Studio", profile: { industry: "dental clinic", subindustry: "orthodontics", goals: ["book aligner consultations", "build trust"], style_tags: ["modern", "professional"], required_capabilities: ["booking", "treatment process"], services: ["clear aligners", "braces", "retainers"] } },
  { id: "emergency", name: "Rapid Relief Dental", profile: { industry: "dental clinic", subindustry: "emergency dentistry", goals: ["urgent appointments", "contact clinic"], style_tags: ["clear", "professional"], required_capabilities: ["contact", "booking"], services: ["tooth pain", "broken tooth", "emergency care"] } },
  { id: "family", name: "Greenleaf Family Dental", profile: { industry: "dental clinic", subindustry: "family dentistry", goals: ["book family appointments", "build trust"], style_tags: ["welcoming", "clean"], required_capabilities: ["booking", "team"], services: ["preventive dentistry", "fillings", "gum care"] } },
  { id: "endodontic", name: "Precision Endodontics", profile: { industry: "dental clinic", subindustry: "endodontics", goals: ["book specialist consultations", "explain treatment"], style_tags: ["clinical", "professional"], required_capabilities: ["booking", "treatment process"], services: ["root canal treatment", "retreatment", "dental pain assessment"] } },
  { id: "restorative", name: "Restore Dental Centre", profile: { industry: "dental clinic", subindustry: "restorative dentistry", goals: ["build credibility", "book consultations"], style_tags: ["premium", "calm"], required_capabilities: ["booking", "gallery"], services: ["crowns", "bridges", "full mouth rehabilitation"] } },
  { id: "smile-design", name: "Luma Smile Design", profile: { industry: "dental clinic", subindustry: "smile design", goals: ["showcase portfolio", "book smile consultations"], style_tags: ["luxury", "visual"], required_capabilities: ["gallery", "booking"], services: ["digital smile design", "veneers", "whitening"] } },
  { id: "implant-education", name: "Implant Care Institute", profile: { industry: "dental clinic", subindustry: "implant dentistry", goals: ["learn about implant treatment", "book consultations"], style_tags: ["premium", "educational"], required_capabilities: ["treatment process", "booking"], services: ["single tooth implants", "implant bridges", "full arch rehabilitation"] } },
];

function buildSite(id: string, name: string, profile: OnboardingProfile): Site {
  const composition = composeWebsite(profile);
  const services = profile.services ?? ["Dental care"];
  const sections = [
    makeSection("global-navbar", "navbar", 1, composition.preset.theme.family, { title: name, items: [{ title: "Services" }, { title: "About" }, { title: "Contact" }], primaryAction: { label: "Book appointment", href: "#contact" } }),
    ...composition.sections.map((section, index) => makeSection(`${section.family}-${index + 1}`, section.family, section.variant, composition.preset.theme.family, contentFor(section.family, name, services))),
    makeSection("global-footer", "footer", 1, composition.preset.theme.family, { title: name, description: "Clear dental care information and a simple way to request an appointment.", items: [{ title: "Services" }, { title: "Contact" }] }),
  ];
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: `visual-${id}`,
    workspaceId: "visual-dental-benchmark",
    name,
    domain: "clinic",
    subtype: "dental",
    theme: composition.preset.theme,
    seoBlueprint: { primaryGoal: "Book dental appointments", targetLocations: ["Hyderabad"], priorityTopics: services, audiences: ["Dental patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{ id: "home", path: "/", name: "Home", sections, seo: { title: `${name} | Dental Care`, description: `Explore dental care at ${name} and request an appointment.`, canonicalPath: "/", indexable: true, structuredDataTypes: ["Dentist"] } }],
    navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
  });
}

function makeSection(id: string, family: SectionFamily, variant: 1 | 2 | 3 | 4 | 5, theme: Site["theme"]["family"], props: Record<string, unknown>) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function contentFor(family: SectionFamily, name: string, services: string[]): Record<string, unknown> {
  const items = services.slice(0, 3).map((service) => ({ title: title(service), description: `Understand ${service.toLowerCase()}, who it may suit, and the next steps to discuss with the dental team.` }));
  switch (family) {
    case "hero": return { eyebrow: "Dental care in Hyderabad", heading: `Dental care designed around clear decisions`, body: `${name} helps patients understand treatment options, practical next steps and how to request an appointment without unnecessary complexity.`, primaryAction: { label: "Book appointment", href: "#contact" }, secondaryAction: { label: "Explore services", href: "#services" } };
    case "about": return { heading: `A clear, patient-focused approach`, body: `${name} presents treatment information in a calm, structured way so patients can prepare questions and make informed decisions with the clinical team.` };
    case "services": return { heading: "Dental services", body: "Explore the treatments most relevant to this practice and use the consultation to understand suitable options for your needs.", items };
    case "features": return { heading: "Care built around clarity", body: "The website prioritises useful treatment information, transparent next steps and easy contact with the clinic.", items: [{ title: "Clear consultations", description: "Discuss concerns, available options and practical next steps." }, { title: "Structured planning", description: "Understand the expected sequence before proceeding with treatment." }, { title: "Ongoing guidance", description: "Receive practical appointment and after-care information from the clinic." }] };
    case "process": return { heading: "What to expect", body: "A simple path from first enquiry to consultation and treatment planning.", items: [{ title: "1. Request an appointment", description: "Share the reason for your visit and preferred contact details." }, { title: "2. Attend the consultation", description: "Discuss your concerns and the treatment options that may be relevant." }, { title: "3. Review next steps", description: "Understand the proposed plan before deciding how to proceed." }] };
    case "team": return { heading: "Meet the dental team", body: "Doctor names, qualifications and experience should be published only after the clinic provides verified details.", items: [{ title: "Clinical team", description: "Verified clinician profiles can be added here by the practice." }, { title: "Patient support", description: "The clinic team can guide appointment and follow-up enquiries." }] };
    case "gallery": return { heading: "Practice and treatment gallery", body: "Use verified clinic photography and consented case media here. Temporary visual placeholders can be replaced by the practice at any time.", items: [{ title: "Clinic environment", description: "Add authentic practice photography." }, { title: "Technology", description: "Show equipment only when verified by the clinic." }, { title: "Case media", description: "Use patient media only with appropriate consent." }] };
    case "testimonials": return { heading: "Patient experiences", body: "Verified patient feedback can be added here after the clinic supplies approved testimonials.", items: [{ title: "Verified review placeholder", description: "Replace with genuine patient feedback supplied by the clinic." }] };
    case "cta": return { heading: "Ready to discuss your dental care?", body: `Request a consultation with ${name} and speak with the clinic about the next suitable step.`, primaryAction: { label: "Request appointment", href: "#contact" } };
    case "contact": return { heading: "Contact the clinic", body: `Send an appointment enquiry to ${name}. The clinic can confirm timing and availability directly.`, primaryAction: { label: "Send enquiry", href: "#contact-form" } };
    default: return { heading: title(family), body: "Useful information for patients considering dental care." };
  }
}

function title(value: string) { return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()); }

async function installRoutes(page: Parameters<typeof test>[0] extends never ? never : any, site: Site, profile: OnboardingProfile) {
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route: any) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route: any) => route.fulfill({ json: { completed: true, profile } }));
  await page.route("**/api/drafts**", async (route: any) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "visual-qa" } } }));
  await page.route("**/api/credits**", async (route: any) => route.fulfill({ json: { balance: 100 } }));
}

test("capture desktop and mobile evidence for ten Dental compositions", async ({ page }) => {
  const outputDirectory = path.join(process.cwd(), "test-results", "dental-visual-comparison");
  await mkdir(outputDirectory, { recursive: true });
  const results: Array<Record<string, unknown>> = [];

  for (const scenario of scenarios) {
    await page.unrouteAll({ behavior: "wait" });
    const site = buildSite(scenario.id, scenario.name, scenario.profile);
    await installRoutes(page, site, scenario.profile);
    await page.addInitScript(() => localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "visual-token", refresh_token: "visual-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: "visual-user", email: "visual@micirql.test" } })));
    await page.goto("/");
    await page.getByRole("button", { name: "Open editor" }).first().click();
    await expect(page.getByText(scenario.name).first()).toBeVisible();
    const preview = page.locator(".renderer-preview-document");
    await expect(preview).toBeVisible();
    await expect(preview.locator("[data-mi-section-id]")).toHaveCount(site.pages[0]!.sections.length);

    const desktopMetrics = await preview.evaluate((element) => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.scrollHeight, textLength: element.textContent?.trim().length ?? 0 }));
    await preview.screenshot({ path: path.join(outputDirectory, `${scenario.id}-desktop.png`) });

    await page.getByRole("button", { name: "mobile", exact: true }).click();
    await expect(page.locator(".site-preview.viewport-mobile")).toBeVisible();
    const mobileMetrics = await preview.evaluate((element) => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, height: element.scrollHeight, textLength: element.textContent?.trim().length ?? 0 }));
    await preview.screenshot({ path: path.join(outputDirectory, `${scenario.id}-mobile.png`) });

    const composition = composeWebsite(scenario.profile);
    const passed = desktopMetrics.textLength > 300 && mobileMetrics.textLength > 300 && desktopMetrics.scrollWidth <= desktopMetrics.width + 2 && mobileMetrics.scrollWidth <= mobileMetrics.width + 2;
    results.push({ scenario: scenario.id, name: scenario.name, preset: composition.preset.id, intent: composition.intent, recipe: composition.industryPack?.recipe.id ?? "none", sectionPattern: composition.sections.map((section) => `${section.family}:${section.variant}`).join("|"), desktopMetrics, mobileMetrics, passed });
  }

  const passed = results.filter((result) => result.passed).length;
  const summary = { generatedAt: new Date().toISOString(), benchmark: "dental-visual-comparison-v1", samples: results.length, screenshots: results.length * 2, passed, passRate: passed / results.length, results };
  await writeFile(path.join(outputDirectory, "report.json"), JSON.stringify(summary, null, 2), "utf8");
  await writeFile(path.join(outputDirectory, "summary.md"), ["# MiCirql Dental Visual Comparison", "", `- Dental sites: **${results.length}**`, `- Screenshots: **${results.length * 2}**`, `- Render/overflow pass rate: **${Math.round((passed / results.length) * 100)}%** (${passed}/${results.length})`, "", "| Scenario | Intent | Preset | Desktop | Mobile |", "| --- | --- | --- | --- | --- |", ...results.map((result: any) => `| ${result.scenario} | ${result.intent} | ${result.preset} | ${result.desktopMetrics.scrollWidth <= result.desktopMetrics.width + 2 ? "PASS" : "OVERFLOW"} | ${result.mobileMetrics.scrollWidth <= result.mobileMetrics.width + 2 ? "PASS" : "OVERFLOW"} |`), ""].join("\n"), "utf8");
  expect(passed, JSON.stringify(summary, null, 2)).toBe(results.length);
});
