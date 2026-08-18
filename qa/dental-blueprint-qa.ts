import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { findWebsiteLayout } from "@micirql/design-engine";
import { applyWebsiteLayoutBlueprint, layoutCoverage } from "../apps/builder/app/apply-layout-blueprint";

export const DENTAL_BLUEPRINT_TARGETS = [360, 390, 430, 768, 1024, 1440] as const;

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

  await installRoutes(args.page, site, args.profile);
  await args.page.addInitScript(() => localStorage.setItem("micirql.supabase.session", JSON.stringify({ access_token: "blueprint-token", refresh_token: "blueprint-refresh", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user: { id: "blueprint-user", email: "blueprint@micirql.test" } })));
  await args.page.goto("/");
  await args.page.getByRole("button", { name: "Open editor" }).first().click();

  const output = path.join(process.cwd(), "test-results", args.outputName);
  await mkdir(output, { recursive: true });
  const results: Array<Record<string, unknown>> = [];

  for (const width of DENTAL_BLUEPRINT_TARGETS) {
    const viewport = viewportFor(width);
    await args.page.getByRole("button", { name: viewport, exact: true }).click();
    const sitePreview = args.page.locator(`.site-preview.viewport-${viewport}`);
    await expect(sitePreview).toBeVisible();
    await sitePreview.evaluate((element, targetWidth) => {
      (element as HTMLElement).style.setProperty("width", `${targetWidth}px`, "important");
      (element as HTMLElement).style.setProperty("max-width", `${targetWidth}px`, "important");
    }, width);

    const document = args.page.locator(".renderer-preview-document");
    const root = document.locator(`[data-mi-layout-blueprint="${args.layoutId}"]`);
    await expect(root).toHaveCount(1);
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

    if (width <= 430 && args.mobileCheck) await args.mobileCheck({ page: args.page, root, width });

    await document.screenshot({ path: path.join(output, `${width}.png`) });
    results.push({ width, viewport, ...metrics, passed });
  }

  await writeFile(path.join(output, "report.json"), JSON.stringify({ layoutId: args.layoutId, targets: DENTAL_BLUEPRINT_TARGETS, coverage, results }, null, 2), "utf8");
}
