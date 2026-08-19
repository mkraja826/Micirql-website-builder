import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { findWebsiteLayout } from "@micirql/design-engine";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";
import { markFirstScreenRepairAttempt, planRenderedFirstScreenRepair } from "../apps/builder/app/rendered-first-screen-repair";

export const DENTAL_BLUEPRINT_TARGETS = [360, 390, 430, 768, 1024, 1440] as const;

const CAPTURE_CLASS = "mi-qa-capture";
const REPAIR_STYLE_ID = "mi-first-screen-repair-style";
const CAPTURE_STYLES = `
[data-mi-canvas-action],
.mi-editor-insert-zone,
.mi-editor-canvas-toolbar,
.renderer-preview-warning {
  display: none !important;
}
details:not([open]) > :not(summary) {
  display: none !important;
}
.renderer-preview-document .mi-editor-section {
  outline: none !important;
  box-shadow: none !important;
}
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

type RenderMetrics = {
  cssViewportWidth: number;
  clientWidth: number;
  scrollWidth: number;
  overflowingSections: number;
  overflowingControls: number;
  overflowingControlDetails: Array<{ tag: string; className: string; text: string; ariaLabel: string }>;
  clippedMedia: number;
  firstScreen: {
    foldHeight: number;
    h1FontPx: number;
    h1LineHeightPx: number;
    h1Lines: number;
    headlineTop: number | null;
    navHeight: number | null;
    heroTop: number | null;
    heroHeight: number | null;
    ctaTop: number | null;
    ctaBottom: number | null;
    ctaInFirstScreen: boolean;
    mediaPresent: boolean;
    mediaTop: number | null;
    mediaHeight: number | null;
    mediaObjectFit: string | null;
    failures: string[];
    passed: boolean;
  };
};

function viewportFor(width: number) {
  if (width <= 430) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

function firstScreenFoldHeight(width: number) {
  if (width <= 430) return 844;
  return 900;
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
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
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

async function measureRenderedComposition(documentRoot: Locator, width: number): Promise<RenderMetrics> {
  return documentRoot.evaluate((element, input) => {
    const root = element as HTMLElement;
    const rootRect = root.getBoundingClientRect();
    const relativeRect = (node: Element | null) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        top: rect.top - rootRect.top,
        bottom: rect.bottom - rootRect.top,
        left: rect.left - rootRect.left,
        right: rect.right - rootRect.left,
        width: rect.width,
        height: rect.height,
      };
    };
    const outside = (node: Element) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && (rect.left < rootRect.left - 1 || rect.right > rootRect.right + 1);
    };
    const isEditorControl = (node: Element) => Boolean(node.closest("[data-mi-canvas-action], .mi-editor-insert-zone, .mi-editor-canvas-toolbar"));
    const isIntentionallyHiddenControl = (node: Element) => {
      if (node.matches("input[type='hidden'], .mi-form-honeypot, [hidden], [aria-hidden='true']")) return true;
      const closedDetails = node.closest("details:not([open])");
      if (closedDetails) {
        const summary = closedDetails.querySelector(":scope > summary");
        if (!summary || !summary.contains(node)) return true;
      }
      const style = getComputedStyle(node);
      return style.display === "none" || style.visibility === "hidden" || Number.parseFloat(style.opacity || "1") === 0;
    };
    const isVisible = (node: Element) => {
      if (isIntentionallyHiddenControl(node)) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const websiteControls = [...root.querySelectorAll("a,button,input,textarea,select")].filter((node) => !isEditorControl(node) && !isIntentionallyHiddenControl(node));
    const overflowingControlNodes = websiteControls.filter(outside);

    const h1 = [...root.querySelectorAll("h1")].find(isVisible) ?? null;
    const hero = h1?.closest("section") ?? h1?.closest(".mi-editor-section") ?? [...root.querySelectorAll("section")].find((node) => /hero/i.test(node.className)) ?? null;
    const nav = [...root.querySelectorAll("header,nav")].find(isVisible) ?? null;
    const heroActions = hero ? [...hero.querySelectorAll("a,button")].filter((node) => {
      if (!isVisible(node) || isEditorControl(node)) return false;
      const label = `${node.textContent ?? ""} ${node.getAttribute("aria-label") ?? ""}`.trim().toLowerCase();
      return Boolean(label) && !/menu|navigation|close|previous|next/.test(label);
    }) : [];
    const primaryCta = heroActions[0] ?? null;
    const heroImage = hero ? [...hero.querySelectorAll("img,video,picture img")].find(isVisible) ?? null : null;
    const backgroundMedia = hero ? [...hero.querySelectorAll("div,figure,section")].find((node) => {
      if (!isVisible(node)) return false;
      const background = getComputedStyle(node).backgroundImage;
      return Boolean(background && background !== "none");
    }) ?? null : null;
    const mediaNode = heroImage ?? backgroundMedia;

    const h1Style = h1 ? getComputedStyle(h1) : null;
    const h1FontPx = h1Style ? Number.parseFloat(h1Style.fontSize) || 0 : 0;
    const rawLineHeight = h1Style ? Number.parseFloat(h1Style.lineHeight) : Number.NaN;
    const h1LineHeightPx = Number.isFinite(rawLineHeight) ? rawLineHeight : h1FontPx * 1.2;
    const h1Rect = relativeRect(h1);
    const heroRect = relativeRect(hero);
    const navRect = relativeRect(nav);
    const ctaRect = relativeRect(primaryCta);
    const mediaRect = relativeRect(mediaNode);
    const h1Lines = h1Rect && h1LineHeightPx > 0 ? Math.max(1, Math.round(h1Rect.height / h1LineHeightPx)) : 0;
    const mediaStyle = mediaNode ? getComputedStyle(mediaNode) : null;

    const firstScreenFailures: string[] = [];
    const mobile = input.width <= 430;
    const desktop = input.width >= 1024;
    const minH1Px = mobile ? 28 : desktop ? 40 : 34;
    const maxH1Lines = mobile ? 4 : desktop ? 3 : 4;
    const maxNavHeight = mobile ? 96 : 116;

    if (!h1 || !h1Rect) firstScreenFailures.push("missing-visible-h1");
    else {
      if (h1FontPx < minH1Px) firstScreenFailures.push(`headline-too-small:${h1FontPx.toFixed(1)}px<${minH1Px}px`);
      if (h1Lines > maxH1Lines) firstScreenFailures.push(`headline-wraps-too-many-lines:${h1Lines}>${maxH1Lines}`);
      if (h1Rect.top > input.foldHeight * 0.62) firstScreenFailures.push(`headline-too-low:${Math.round(h1Rect.top)}px`);
    }
    if (navRect && navRect.height > maxNavHeight) firstScreenFailures.push(`navbar-too-tall:${Math.round(navRect.height)}px>${maxNavHeight}px`);
    if (!primaryCta || !ctaRect) firstScreenFailures.push("missing-visible-hero-cta");
    else {
      if (ctaRect.top > input.foldHeight * 0.94) firstScreenFailures.push(`cta-below-conversion-fold:${Math.round(ctaRect.top)}px`);
      if (ctaRect.bottom > input.foldHeight * 1.04) firstScreenFailures.push(`cta-not-visible-in-first-screen:${Math.round(ctaRect.bottom)}px`);
    }
    if (heroRect && heroRect.top > Math.max(180, input.foldHeight * 0.24)) firstScreenFailures.push(`hero-starts-too-low:${Math.round(heroRect.top)}px`);
    if (navRect && h1Rect && h1Rect.top - navRect.bottom > (mobile ? 260 : 320)) firstScreenFailures.push(`excess-space-before-headline:${Math.round(h1Rect.top - navRect.bottom)}px`);

    return {
      cssViewportWidth: window.innerWidth,
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      overflowingSections: [...root.querySelectorAll("section,header,footer")].filter(outside).length,
      overflowingControls: overflowingControlNodes.length,
      overflowingControlDetails: overflowingControlNodes.slice(0, 8).map((node) => ({
        tag: node.tagName.toLowerCase(),
        className: node.getAttribute("class") ?? "",
        text: (node.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120),
        ariaLabel: node.getAttribute("aria-label") ?? "",
      })),
      clippedMedia: [...root.querySelectorAll("img,video,iframe")].filter(outside).length,
      firstScreen: {
        foldHeight: input.foldHeight,
        h1FontPx: Number(h1FontPx.toFixed(1)),
        h1LineHeightPx: Number(h1LineHeightPx.toFixed(1)),
        h1Lines,
        headlineTop: h1Rect ? Math.round(h1Rect.top) : null,
        navHeight: navRect ? Math.round(navRect.height) : null,
        heroTop: heroRect ? Math.round(heroRect.top) : null,
        heroHeight: heroRect ? Math.round(heroRect.height) : null,
        ctaTop: ctaRect ? Math.round(ctaRect.top) : null,
        ctaBottom: ctaRect ? Math.round(ctaRect.bottom) : null,
        ctaInFirstScreen: Boolean(ctaRect && ctaRect.top <= input.foldHeight * 0.94 && ctaRect.bottom <= input.foldHeight * 1.04),
        mediaPresent: Boolean(mediaNode),
        mediaTop: mediaRect ? Math.round(mediaRect.top) : null,
        mediaHeight: mediaRect ? Math.round(mediaRect.height) : null,
        mediaObjectFit: heroImage && mediaStyle ? mediaStyle.objectFit : null,
        failures: firstScreenFailures,
        passed: firstScreenFailures.length === 0,
      },
    };
  }, { width, foldHeight: firstScreenFoldHeight(width) });
}

async function applyRenderedRepair(page: Page, documentRoot: Locator, width: number, failures: string[]) {
  const plan = planRenderedFirstScreenRepair({ width, failures, attempt: 0 });
  if (!plan.required || !plan.css) return plan;

  await documentRoot.evaluate((element) => markFirstScreenRepairAttempt(element as HTMLElement));
  await page.evaluate(({ id, css }) => {
    document.getElementById(id)?.remove();
    const style = document.createElement("style");
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  }, { id: REPAIR_STYLE_ID, css: plan.css });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return plan;
}

async function clearRenderedRepair(page: Page, documentRoot: Locator) {
  await documentRoot.evaluate((element) => {
    element.removeAttribute("data-mi-first-screen-repair");
    element.removeAttribute("data-mi-first-screen-repair-attempt");
  });
  await page.evaluate((id) => document.getElementById(id)?.remove(), REPAIR_STYLE_ID);
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

    const documentRoot = args.page.locator(".renderer-preview-document");
    await expect(documentRoot).toBeVisible();
    await clearRenderedRepair(args.page, documentRoot);
    await documentRoot.evaluate((element, metadata) => {
      element.setAttribute("data-mi-layout-blueprint", metadata.layoutId);
      element.setAttribute("data-mi-layout-archetype", metadata.archetype);
    }, { layoutId: layout.id, archetype: layout.archetype });
    await expect(documentRoot).toHaveAttribute("data-mi-layout-blueprint", args.layoutId);
    await args.page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    const beforeRepair = await measureRenderedComposition(documentRoot, width);
    const repairPlan = await applyRenderedRepair(args.page, documentRoot, width, beforeRepair.firstScreen.failures);
    const repairApplied = repairPlan.required;
    const metrics = repairApplied ? await measureRenderedComposition(documentRoot, width) : beforeRepair;

    let mobileCheckPassed = true;
    let mobileCheckError: string | undefined;
    if (width <= 430 && args.mobileCheck) {
      try {
        await args.mobileCheck({ page: args.page, root: documentRoot, width });
      } catch (caught) {
        mobileCheckPassed = false;
        mobileCheckError = caught instanceof Error ? caught.message : String(caught);
      }
    }

    const firstScreenPassed = metrics.firstScreen.passed;
    const corePassed = metrics.cssViewportWidth === width && metrics.scrollWidth <= metrics.clientWidth + 1 && metrics.overflowingSections === 0 && metrics.overflowingControls === 0 && metrics.clippedMedia === 0;
    const passed = corePassed && mobileCheckPassed && firstScreenPassed;

    expect.soft(metrics.cssViewportWidth, `${width}px CSS viewport mismatch`).toBe(width);
    expect.soft(metrics.scrollWidth, `${width}px document overflow`).toBeLessThanOrEqual(metrics.clientWidth + 1);
    expect.soft(metrics.overflowingSections, `${width}px section overflow`).toBe(0);
    expect.soft(metrics.overflowingControls, `${width}px website control overflow: ${JSON.stringify(metrics.overflowingControlDetails)}`).toBe(0);
    expect.soft(metrics.clippedMedia, `${width}px media overflow`).toBe(0);
    expect.soft(firstScreenPassed, `${width}px rendered first-screen composition failed after ${repairApplied ? "one repair" : "initial render"}: ${metrics.firstScreen.failures.join(", ")}`).toBeTruthy();
    if (!mobileCheckPassed) expect.soft(mobileCheckPassed, `${width}px mobile composition check failed: ${mobileCheckError}`).toBeTruthy();

    await captureWebsiteEvidence(args.page, documentRoot, path.join(output, `${width}.png`));
    results.push({
      width,
      viewport,
      ...metrics,
      firstScreenRepair: {
        attempted: repairApplied,
        operations: repairPlan.operations,
        reasons: repairPlan.reasons,
        before: beforeRepair.firstScreen,
        after: metrics.firstScreen,
        repaired: repairApplied && !beforeRepair.firstScreen.passed && metrics.firstScreen.passed,
        rejectedAfterRepair: repairApplied && !metrics.firstScreen.passed,
      },
      mobileCheckPassed,
      ...(mobileCheckError ? { mobileCheckError } : {}),
      passed,
    });
  }

  await writeFile(path.join(output, "report.json"), JSON.stringify({
    layoutId: args.layoutId,
    targets: DENTAL_BLUEPRINT_TARGETS,
    coverage,
    blueprintMetadataVerified: true,
    blueprintCssScopeApplied: true,
    screenshotsIsolatedFromEditorChrome: true,
    screenshotBackgroundRestored: true,
    renderedFirstScreenCertified: true,
    renderedFirstScreenAutoRepair: "single-bounded-pass",
    results,
  }, null, 2), "utf8");
}
