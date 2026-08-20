import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { nativeFunctionCatalog } from "@micirql/functions";
import { DENTAL_LAYOUT_BLUEPRINTS } from "@micirql/design-engine";
import { createFunctionBindingResolver, renderPreparedPage, type PreparedPage, type RendererRegistry } from "@micirql/renderer";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import { prerender } from "react-dom/static";
import { applyDentalMultipageArchitecture } from "../apps/builder/app/dental-multipage-architecture";
import { applyDentalMultipageMediaSafety } from "../apps/builder/app/dental-multipage-media-safety";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";
import { composeWebsite } from "../apps/builder/app/composition-intelligence";
import { configureLiveHostRuntime, serveLiveRequest } from "../apps/live/live-runtime";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

const repoRoot = process.cwd();
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const HOST = "implant-live.test";
const ORIGIN = `https://${HOST}`;
const TREATMENT_PATH = "/treatments/dental-implants";
const LAYOUT_ID = "dental-02-implant-luxury";
const QA_HERO_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='1200' viewBox='0 0 1600 1200'%3E%3Crect width='1600' height='1200' fill='%23e7e2dc'/%3E%3Ccircle cx='1180' cy='330' r='260' fill='%23cfc5ba'/%3E%3Cpath d='M0 940 C420 720 730 1130 1600 760 L1600 1200 L0 1200 Z' fill='%23d9d0c7'/%3E%3C/svg%3E";

const profile: OnboardingProfile = {
  industry: "dental clinic",
  subindustry: "implant dentistry",
  goals: ["book appointments", "build trust"],
  style_tags: ["premium", "professional", "clinical"],
  required_capabilities: ["booking", "contact", "treatment process", "faq"],
  services: ["dental implants", "cosmetic dentistry", "root canal treatment"],
};

let runtimeCss = "";
let site: Site;

function buildPublishedSite(): Site {
  const layout = DENTAL_LAYOUT_BLUEPRINTS.find((candidate) => candidate.id === LAYOUT_ID);
  if (!layout) throw new Error(`Missing representative Dental layout ${LAYOUT_ID}`);
  const composition = composeWebsite(profile, {
    selectedLayoutId: layout.id,
    selectedLayoutScore: 100,
    selectedLayoutReasons: ["Published-live implant parity fixture"],
  });
  if (composition.layoutCandidate?.layout.id !== layout.id) throw new Error("Representative layout selection drifted");

  const name = "Aurelia Implant Atelier";
  const services = profile.services ?? ["dental implants"];
  const sections = [
    makeSection("global-navbar", "navbar", 1, composition.preset.theme.family, {
      title: name,
      items: [{ title: "Treatments" }, { title: "Contact" }],
      primaryAction: { label: "Book consultation", href: "/contact" },
    }),
    ...composition.sections.map((section, index) => makeSection(
      `${section.family}-${index + 1}`,
      section.family,
      section.variant,
      composition.preset.theme.family,
      contentFor(section.family, name, services),
    )),
    makeSection("global-footer", "footer", 1, composition.preset.theme.family, {
      title: name,
      description: "Assessment-led dental care with clear consultation routes.",
      items: [{ title: "Treatments" }, { title: "Contact" }],
    }),
  ];

  const base = siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "live-implant-parity-site",
    workspaceId: "live-implant-parity-workspace",
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
  if (!coverage.complete) throw new Error(`Representative layout coverage incomplete: ${coverage.missing.join(", ")}`);
  const laidOut = applyWebsiteLayoutBlueprint(base, layout);
  const multipage = applyDentalMultipageArchitecture(laidOut, profile);
  if (!multipage.treatmentPages.includes(TREATMENT_PATH)) throw new Error("Implant treatment page was not generated");
  const safe = applyDentalMultipageMediaSafety(multipage.site).site;
  const implant = safe.pages.find((page) => page.path === TREATMENT_PATH);
  if (!implant) throw new Error("Generated implant page is missing");
  if (!implant.sections.every((section) => section.props.layoutBlueprintId === LAYOUT_ID)) throw new Error("Implant page lost cross-page blueprint identity");
  return safe;
}

function makeSection(
  id: string,
  family: SectionFamily,
  variant: 1 | 2 | 3 | 4 | 5,
  theme: Site["theme"]["family"],
  props: Record<string, unknown>,
) {
  return { id, component: { componentId: sectionDesignId(theme, family, variant), version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function contentFor(family: SectionFamily, name: string, services: string[]): Record<string, unknown> {
  const serviceItems = services.map((service) => ({ title: title(service), description: `Clear information about ${service.toLowerCase()} and consultation planning.` }));
  if (family === "hero") return {
    eyebrow: "Implant-focused dental care",
    title: "Clinical precision with a considered patient experience",
    description: `${name} presents treatment information and next steps with clarity.`,
    primaryAction: { label: "Book consultation", href: "/contact" },
    secondaryAction: { label: "Explore treatments", href: "#services" },
    image: { src: QA_HERO_IMAGE, alt: "Dental implant consultation planning" },
    imageSlotMode: "section",
    imageRatio: "4:3",
    imageFit: "cover",
    imageFocalPoint: "center",
  };
  if (family === "services") return { title: "Treatments", items: serviceItems };
  if (family === "features") return { title: "Why patients value clarity", items: proofItems() };
  if (family === "process") return { title: "Treatment journey", items: processItems() };
  if (family === "about") return { title: "Assessment-led care", description: "Treatment decisions begin with an individual clinical assessment and a clear discussion of suitable options.", items: proofItems() };
  if (family === "faq") return { title: "Patient questions", items: [{ title: "What happens at consultation?", description: "The clinical team assesses your needs and explains suitable next steps." }] };
  if (family === "cta") return { title: "Discuss your treatment options", description: "Request a consultation to discuss the appropriate next step.", primaryAction: { label: "Book consultation", href: "/contact" } };
  if (family === "contact") return { title: "Book a consultation", description: "Send an enquiry and the clinic can confirm availability.", primaryAction: { label: "Contact clinic", href: "/contact" } };
  if (family === "team") return { title: "Clinical team", items: [{ title: "Lead clinician", description: "Verified clinician information belongs here." }] };
  if (family === "gallery") return { title: "Clinic gallery", items: [] };
  if (family === "testimonials") return { title: "Patient confidence", items: [] };
  return { title: title(family), description: "Clear dental care information.", items: proofItems() };
}

function proofItems() {
  return [
    { title: "Clear planning", description: "Understand the proposed sequence before treatment begins." },
    { title: "Individual assessment", description: "Recommendations depend on clinical findings." },
    { title: "Defined next steps", description: "Consultation leads to a documented plan." },
  ];
}

function processItems() {
  return [
    { title: "Consultation", description: "Discuss concerns and treatment goals." },
    { title: "Assessment", description: "Complete the investigations appropriate to the case." },
    { title: "Plan", description: "Review options and agree the next step." },
  ];
}

function title(value: string) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

async function generatedLiveRuntimeCss(): Promise<string> {
  execFileSync(pnpm, ["--filter", "@micirql/live", "generate:runtime-css"], { cwd: repoRoot, stdio: "pipe", env: process.env });
  const generated = await readFile(path.join(repoRoot, "apps/live/generated/runtime-css.ts"), "utf8");
  const match = generated.match(/export const MICIRQL_RUNTIME_CSS = (.*);\s*$/s);
  if (!match?.[1]) throw new Error("Unable to read generated live runtime CSS artifact");
  return JSON.parse(match[1]) as string;
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}

async function installPublishedRoutes(page: Page) {
  await page.route(`${ORIGIN}/**`, async (route) => {
    if (new URL(route.request().url()).pathname === "/__micirql/runtime.css") {
      await route.fulfill({ status: 200, contentType: "text/css", body: runtimeCss });
      return;
    }
    const request = new Request(route.request().url(), { method: route.request().method(), headers: route.request().headers() });
    const response = await serveLiveRequest(request);
    const headers = Object.fromEntries(response.headers.entries());
    await route.fulfill({ status: response.status, headers, body: await response.text() });
  });
}

async function viewportMetrics(page: Page) {
  return page.locator("main[data-mi-site]").evaluate((root) => {
    const rect = root.getBoundingClientRect();
    const visible = (element: Element) => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const escaped = [...root.querySelectorAll<HTMLElement>("*")].filter((node) => visible(node)).filter((node) => {
      const box = node.getBoundingClientRect();
      return box.left < rect.left - 1 || box.right > rect.right + 1;
    }).length;
    const undersized = [...root.querySelectorAll<HTMLElement>("a[href],button,summary,[role=button]")].filter((node) => visible(node)).filter((node) => {
      const box = node.getBoundingClientRect();
      return box.width < 44 || box.height < 44;
    }).length;
    return {
      scrollWidth: (root as HTMLElement).scrollWidth,
      clientWidth: (root as HTMLElement).clientWidth,
      escaped,
      undersized,
      placeholderCount: root.querySelectorAll(".mi-image-slot-placeholder").length,
    };
  });
}

test.beforeAll(async () => {
  runtimeCss = await generatedLiveRuntimeCss();
  site = buildPublishedSite();

  const emptyExternalRegistry: RendererRegistry = { async resolve() { return undefined; } };
  configureLiveHostRuntime({
    store: {
      async resolveHostname(hostname) { return hostname === HOST ? { siteId: site.siteId } : undefined; },
      async getPublishedSite(siteId) { return siteId === site.siteId ? { siteId, versionId: "implant-live-v1", snapshot: site } : undefined; },
    },
    registry: emptyExternalRegistry,
    functions: createFunctionBindingResolver({ actionIds: nativeFunctionCatalog.map((item) => item.id) }),
    async renderPage(prepared: PreparedPage) {
      const { prelude } = await prerender(renderPreparedPage(prepared));
      return streamToString(prelude);
    },
    cacheTtlSeconds: 0,
  });
});

test("published host resolves built-in sections and serves the generated implant page", async ({ page }) => {
  await installPublishedRoutes(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const response = await page.goto(`${ORIGIN}${TREATMENT_PATH}`, { waitUntil: "load" });
  expect(response?.status()).toBe(200);

  await expect(page.locator('link[rel="stylesheet"][href="/__micirql/runtime.css"]')).toHaveCount(1);
  const root = page.locator('main[data-mi-site="live-implant-parity-site"]');
  await expect(root).toHaveAttribute("data-mi-page", "treatment-implant");
  await expect(root).toHaveAttribute("data-mi-layout-blueprint", LAYOUT_ID);
  await expect(root).toHaveAttribute("data-mi-layout-archetype", /.+/);

  const sectionIds = await page.locator('[data-mi-live-section="built-in"][data-mi-section-id]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-mi-section-id")));
  expect(sectionIds).toEqual(["implant-nav", "implant-hero", "implant-assessment", "implant-journey", "implant-faq", "implant-cta", "implant-footer"]);

  await expect(page.getByRole("heading", { level: 1, name: /Dental implant care begins with careful assessment and planning/i })).toBeVisible();
  await expect(page.locator('.mi-breadcrumbs[aria-label="Breadcrumb"] [aria-current="page"]')).toHaveText("Dental Implants");
  await expect(page.locator('[data-mi-section-id="implant-faq"] details.mi-faq-item')).toHaveCount(3);
  await expect(page.locator('[data-mi-section-id="implant-hero"] a[href="/contact"]')).toHaveCount(1);
  await expect(page.locator('[data-mi-section-id="implant-hero"] a[href="/#treatments"]')).toHaveCount(1);
  await expect(page.locator('[data-mi-section-id="implant-cta"] a[href="/contact"]')).toHaveCount(1);
  await expect(page.locator(".mi-image-slot-placeholder")).toHaveCount(0);

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${ORIGIN}${TREATMENT_PATH}`);
  const structuredTypes = await page.locator('script[type="application/ld+json"]').evaluateAll((nodes) => nodes.flatMap((node) => {
    try {
      const parsed = JSON.parse(node.textContent ?? "{}") as { "@type"?: string };
      return parsed["@type"] ? [parsed["@type"]] : [];
    } catch { return []; }
  }));
  expect(structuredTypes).toEqual(expect.arrayContaining(["BreadcrumbList", "FAQPage"]));
});

test("published implant page remains overflow-safe at mobile, tablet and desktop widths", async ({ page }) => {
  await installPublishedRoutes(page);
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${ORIGIN}${TREATMENT_PATH}`, { waitUntil: "load" });
    const metrics = await viewportMetrics(page);
    expect(metrics.scrollWidth, `published implant overflow at ${viewport.width}px`).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.escaped, `published implant child escape at ${viewport.width}px`).toBe(0);
    expect(metrics.placeholderCount).toBe(0);
    if (viewport.width === 390) expect(metrics.undersized, "published implant mobile target below 44px").toBe(0);
  }
});
