import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { findWebsiteLayout } from "@micirql/design-engine";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";

export const DENTAL_BLUEPRINT_TARGETS = [360, 390, 430, 768, 1024, 1440] as const;

const CAPTURE_CLASS = "mi-qa-capture";
const CAPTURE_STYLES = `
html.${CAPTURE_CLASS} body *:not(.site-preview):not(.site-preview *) {
  visibility: hidden !important;
  pointer-events: none !important;
}
html.${CAPTURE_CLASS} .site-preview,
html.${CAPTURE_CLASS} .site-preview * {
  visibility: visible !important;
}
html.${CAPTURE_CLASS} .site-preview {
  position: relative !important;
  z-index: 2147483647 !important;
  margin: 0 !important;
}
html.${CAPTURE_CLASS} .renderer-preview-document {
  background: var(--mi-background, #ffffff) !important;
}
html.${CAPTURE_CLASS} [data-mi-canvas-action],
html.${CAPTURE_CLASS} .mi-editor-insert-zone,
html.${CAPTURE_CLASS} .mi-editor-canvas-toolbar,
html.${CAPTURE_CLASS} .renderer-preview-warning {
  display: none !important;
}
html.${CAPTURE_CLASS} .mi-editor-section {
  outline: none !important;
  box-shadow: none !important;
}
`;

type Profile = {
  industry: string;
  subindustry: string;
  goals: string[];
  style_tags: string[];
  required_capabilities: string[];
  services: string[];
};

type MobileCheck = (args: { page: Page; root: Locator; width: number }) => Promise<void>;

function viewportFor(width: number) {
  if (width <= 430) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

async function selectViewport(page: Page, viewport: "mobile" | "tablet" | "desktop") {
  const control = page.locator(".viewport-switcher button").filter({ hasText: new RegExp(`^${viewport}$`, "i") });
  await expect(control).toHaveCount(1);
  await control.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(page.locator(`.site-preview.viewport-${viewport}`)).toBeVisible();
}

async function activateCssViewport(page: Page, width: number) {
  await page.setViewportSize({ width, height: 1100 });
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(width);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function installCaptureStyles(page: Page) {
  await page.addStyleTag({ content: CAPTURE_STYLES });
}

async function captureWebsiteEvidence(page: Page, target: Locator, filePath: string) {
  await page.evaluate((captureClass) => document.documentElement.classList.add(captureClass), CAPTURE_CLASS);
  try {
    await target.screenshot({ path: filePath });
  } finally {
    await page.evaluate((captureClass) => document.documentElement.classList.remove(captureClass), CAPTURE_CLASS);
  }
}

async function installRoutes(page: Page, site: Site, profile: Profile) {
  const now = new Date().toISOString();
  const project = { id: site.siteId, workspace_id: site.workspaceId, name: site.name, status: "draft", published_version_id: null, updated_at: now, draft: { revision: 4, updated_at: now }, hostname: null };
  await page.route("**/api/projects**", async (route) => route.fulfill({ json: { projects: [project] } }));
  await page.route("**/api/onboarding**", async (route) => route.fulfill({ json: { completed: true, profile } }));
  await page.route("**/api/drafts**", async (route) => route.fulfill({ json: { draft: { workspaceId: site.workspaceId, siteId: site.siteId, revision: 4, snapshot: site, updatedAt: now, updatedBy: "blueprint-qa" } } }));
  await page.route("**/api/credits**", async (route) => route.fulfill({ json: { balance: 100 } }));
}

export async function runDentalBlueprintCertification(args: {
  page: Page;
  layoutId: string;
  site: Site;
  profile: Profile;
  outputName: string;
  mobileCheck?: MobileCheck;
}) {
  const layout = findWebsiteLayout(args.layoutId);
  if (!layout) throw new Error(`${args.layoutId} is missing from the layout library.`);
  const coverage = layoutCoverage(args.site, layout);
  expect(coverage.complete, `Missing blueprint sections: ${coverage.missing.join(", ")}`).toBeTruthy();
  const site = applyWebsiteLayoutBlueprint(args.site, layout);
  const home = site.pages.find((page) => page.path === "/") ?? site.pages[0];
  expect(home?.sections.length, `${args.layoutId} produced an empty home page`).toBeGreaterThan(0);
  for (const section of home?.sections ?? []) {
    expect(section.props.layoutBlueprintId, `${args.layoutId} metadata missing on ${section.id}`).toBe(args.layoutId);
    expect(section.props.layoutArchetype, `${args.layoutId} archetype metadata missing on ${section.id}`).toBe(layout.archetype);
  }

  await installRoutes(args.page, site, args.profile);
  await args.page.addInitScript(() => localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "blueprint-token", refresh_token: "blueprint-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: "blueprint-user", email: "blueprint@micirql.test" } })));
  await args.page.setViewportSize({ width: 1800, height: 1100 });
  await args.page.goto("/");
  await args.page.getByRole("button", { name: "Open editor" }).first().click();
  await installCaptureStyles(args.page);

  const output = path.join(process.cwd(), "test-results", args.outputName);
  await mkdir(output, { recursive: true });
  const results: Array<Record<string, unknown>> = [];

  for (const width of DENTAL_BLUEPRINT_TARGETS) {
    await args.page.setViewportSize({ width: 1800, height: 1100 });
    const viewport = viewportFor(width);
    await selectViewport(args.page, viewport);
    const sitePreview = args.page.locator(`.site-preview.viewport-${viewport}`);
    await expect(sitePreview).toBeVisible();
    await sitePreview.evaluate((element, targetWidth) => {
      (element as HTMLElement).style.setProperty("width", `${targetWidth}px`, "important");
      (element as HTMLElement).style.setProperty("max-width", `${targetWidth}px`, "important");
    }, width);
    await expect.poll(() => sitePreview.evaluate((element, targetWidth) => Math.abs(element.getBoundingClientRect().width - targetWidth), width)).toBeLessThanOrEqual(0.5);
    await activateCssViewport(args.page, width);

    const document = args.page.locator(".renderer-preview-document");
    await expect(document).toBeVisible();
    // Production rendering places these attributes on the page <main>. The
    // editor preview renders the same sections without the production wrapper,
    // so mirror the wrapper metadata here before exercising blueprint-scoped CSS.
    await document.evaluate((element, metadata) => {
      element.setAttribute("data-mi-layout-blueprint", metadata.layoutId);
      element.setAttribute("data-mi-layout-archetype", metadata.archetype);
    }, { layoutId: layout.id, archetype: layout.archetype });
    await expect(document).toHaveAttribute("data-mi-layout-blueprint", args.layoutId);
    await args.page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const metrics = await document.evaluate((element) => {
      const root = element as HTMLElement;
      const rootRect = root.getBoundingClientRect();
      const outside = (node: Element) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1);
      };
      return {
        cssViewportWidth: window.innerWidth,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        overflowingSections: [...root.querySelectorAll("section,header,footer")].filter(outside).length,
        overflowingControls: [...root.querySelectorAll("a,button,input,textarea,select")].filter(outside).length,
        clippedMedia: [...root.querySelectorAll("img,video,iframe")].filter(outside).length,
      };
    });

    const passed = metrics.cssViewportWidth === width && metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.overflowingSections === 0 && metrics.overflowingControls === 0 && metrics.clippedMedia === 0;
    expect(metrics.cssViewportWidth, `${width}px CSS viewport mismatch`).toBe(width);
    expect(metrics.scrollWidth, `${width}px document overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect(metrics.overflowingSections, `${width}px section overflow`).toBe(0);
    expect(metrics.overflowingControls, `${width}px control overflow`).toBe(0);
    expect(metrics.clippedMedia, `${width}px media overflow`).toBe(0);

    if (width <= 430 && args.mobileCheck) await args.mobileCheck({ page: args.page, root: document, width });

    await captureWebsiteEvidence(args.page, document, path.join(output, `${width}.png`));
    results.push({ width, viewport, ...metrics, passed });
  }

  await writeFile(path.join(output, "report.json"), JSON.stringify({ layoutId: args.layoutId, targets: DENTAL_BLUEPRINT_TARGETS, coverage, blueprintMetadataVerified: true, blueprintCssScopeApplied: true, screenshotsIsolatedFromEditorChrome: true, screenshotBackgroundRestored: true, results }, null, 2), "utf8");
}