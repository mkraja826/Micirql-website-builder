import { expect, test, type Page } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { liveFirstScreenRepair } from "@micirql/live-runtime";
import { persistedFirstScreenRepairCss } from "../apps/builder/app/persisted-first-screen-repair";

const MOBILE_CSS = `[data-mi-first-screen-repair='1'] h1{font-size:32px!important;line-height:1.05!important;max-width:19ch!important;text-wrap:balance;}\n[data-mi-first-screen-repair='1'] header,[data-mi-first-screen-repair='1'] nav{max-height:88px!important;}\n[data-mi-first-screen-repair='1'] section:has(h1){padding-top:32px!important;padding-bottom:40px!important;}`;
const DESKTOP_CSS = `[data-mi-first-screen-repair='1'] h1{font-size:52px!important;line-height:1.05!important;max-width:28ch!important;text-wrap:balance;}\n[data-mi-first-screen-repair='1'] header,[data-mi-first-screen-repair='1'] nav{max-height:104px!important;}\n[data-mi-first-screen-repair='1'] section:has(h1){padding-top:48px!important;padding-bottom:56px!important;}`;

function repairedSite(): Site {
  return {
    siteId: "parity-site",
    workspaceId: "parity-workspace",
    name: "Aurelia Dental",
    pages: [{
      id: "home",
      name: "Home",
      path: "/",
      seo: { title: "Aurelia Dental", description: "Implant dentistry", indexable: true },
      sections: [{
        id: "hero",
        hidden: false,
        component: { componentId: "DENTAL-HERO-01", version: "1" },
        props: {
          title: "Dental implants planned around your needs",
          renderedFirstScreenRepairs: {
            mobile: { version: 1, viewport: "mobile", operations: ["increase-headline-scale"], reasons: ["headline-too-small"], css: MOBILE_CSS },
            desktop: { version: 1, viewport: "desktop", operations: ["increase-headline-scale"], reasons: ["headline-too-small"], css: DESKTOP_CSS },
          },
        },
      }],
    }],
  } as unknown as Site;
}

test("published runtime resolves the exact repair CSS used by Preview", () => {
  const site = repairedSite();
  const live = liveFirstScreenRepair(site, "/");

  expect(live.enabled).toBe(true);
  expect(live.mobile).toBe(persistedFirstScreenRepairCss(site, "mobile", "/"));
  expect(live.desktop).toBe(persistedFirstScreenRepairCss(site, "desktop", "/"));
  expect(live.css).toContain("@media (max-width:430px)");
  expect(live.css).toContain("@media (min-width:1025px)");
});

for (const target of [
  { width: 390, viewport: "mobile" as const, tolerance: 0.5 },
  { width: 1440, viewport: "desktop" as const, tolerance: 0.5 },
]) {
  test(`Preview and published repair geometry match at ${target.width}px`, async ({ page }) => {
    const site = repairedSite();
    const previewCss = persistedFirstScreenRepairCss(site, target.viewport, "/");
    const live = liveFirstScreenRepair(site, "/");
    const liveCss = target.viewport === "mobile" ? live.mobile : live.desktop;

    const previewMetrics = await renderAndMeasure(page, target.width, previewCss);
    const liveMetrics = await renderAndMeasure(page, target.width, liveCss);

    expect(Math.abs(previewMetrics.h1FontPx - liveMetrics.h1FontPx)).toBeLessThanOrEqual(target.tolerance);
    expect(Math.abs(previewMetrics.h1Top - liveMetrics.h1Top)).toBeLessThanOrEqual(target.tolerance);
    expect(Math.abs(previewMetrics.navHeight - liveMetrics.navHeight)).toBeLessThanOrEqual(target.tolerance);
    expect(Math.abs(previewMetrics.ctaTop - liveMetrics.ctaTop)).toBeLessThanOrEqual(target.tolerance);
    expect(Math.abs(previewMetrics.ctaBottom - liveMetrics.ctaBottom)).toBeLessThanOrEqual(target.tolerance);
  });
}

async function renderAndMeasure(page: Page, width: number, repairCss: string) {
  await page.setViewportSize({ width, height: 1000 });
  await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box} body{margin:0;font-family:Arial,sans-serif} header{height:120px;padding:28px 32px;background:#fff}
    section{padding:120px 32px 96px} h1{font-size:24px;line-height:1.3;margin:0;max-width:14ch}
    p{max-width:48ch;margin:20px 0} a{display:inline-flex;margin-top:32px;padding:14px 20px;border:1px solid #111}
    ${repairCss}
  </style></head><body data-mi-first-screen-repair="1"><header><nav>Navigation</nav></header><section><h1>Dental implants planned around your needs</h1><p>Consultation-led implant care with clear assessment, planning and next steps.</p><a href="#contact">Book consultation</a></section></body></html>`);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  return page.evaluate(() => {
    const h1 = document.querySelector("h1")!;
    const nav = document.querySelector("header")!;
    const cta = document.querySelector("a")!;
    const h1Rect = h1.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    const ctaRect = cta.getBoundingClientRect();
    return {
      h1FontPx: Number.parseFloat(getComputedStyle(h1).fontSize),
      h1Top: h1Rect.top,
      navHeight: navRect.height,
      ctaTop: ctaRect.top,
      ctaBottom: ctaRect.bottom,
    };
  });
}
