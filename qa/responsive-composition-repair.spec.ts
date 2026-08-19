import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { planResponsiveCompositionRepair } from "../apps/builder/app/rendered-responsive-composition-repair";

test("responsive composition repair is bounded and does not hide structural overflow", () => {
  const overflowOnly = planResponsiveCompositionRepair({
    width: 390,
    attempt: 0,
    issues: [{ code: "HORIZONTAL_OVERFLOW", severity: "error", detail: "410px>390px" }],
  });
  expect(overflowOnly.required).toBe(false);
  expect(overflowOnly.css).toBe("");

  const repair = planResponsiveCompositionRepair({
    width: 390,
    attempt: 0,
    issues: [
      { code: "CARD_COLUMN_TOO_NARROW", severity: "error", detail: "118px<148px" },
      { code: "TOUCH_TARGET_TOO_SMALL", severity: "warning", detail: "34x36" },
      { code: "MOBILE_MEDIA_TEXT_NOT_STACKED", severity: "warning", detail: "media/text remain side-by-side at 390px" },
    ],
  });
  expect(repair.required).toBe(true);
  expect(repair.viewport).toBe("mobile");
  expect(repair.operations).toEqual(expect.arrayContaining(["rebalance-card-grid", "normalize-touch-targets", "stack-media-text"]));
  expect(repair.css).toContain("grid-template-columns:repeat(1,minmax(0,1fr))");
  expect(repair.css).toContain("min-height:44px");
  expect(repair.css).not.toContain("overflow-x:hidden");
  expect(repair.css).not.toContain("display:none");

  const retry = planResponsiveCompositionRepair({
    width: 390,
    attempt: 1,
    issues: [{ code: "CARD_COLUMN_TOO_NARROW", severity: "error", detail: "118px<148px" }],
  });
  expect(retry.required).toBe(false);
});

test("review certifier persists one composition repair per viewport before rejection", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");
  const persistence = readFileSync("apps/builder/app/persisted-responsive-composition-repair.ts", "utf8");
  const previewBridge = readFileSync("apps/builder/app/persisted-first-screen-repair.ts", "utf8");

  expect(certifier).toContain("const [compositionAttempt, setCompositionAttempt] = useState<0 | 1>(0)");
  expect(certifier).toContain("planResponsiveCompositionRepair");
  expect(certifier).toContain("persistResponsiveCompositionRepair(current.site, plan)");
  expect(certifier).toContain("setCompositionAttempt(1)");
  expect(certifier).toContain("responsiveCompositionRepairs");

  expect(persistence).toContain('const PROP_KEY = "responsiveCompositionRepairs"');
  expect(persistence).toContain("siteSchema.parse(next)");
  expect(persistence).toContain('["mobile", "tablet", "desktop"]');
  expect(previewBridge).toContain("persistedResponsiveCompositionRepairCss(site, viewport, path)");
});
