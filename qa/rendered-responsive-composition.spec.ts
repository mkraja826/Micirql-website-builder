import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("rendered responsive composition evaluator protects core layout failure modes", () => {
  const source = readFileSync("apps/builder/app/rendered-responsive-composition-quality.ts", "utf8");

  expect(source).toContain("HORIZONTAL_OVERFLOW");
  expect(source).toContain("CONTENT_GUTTER_TOO_TIGHT");
  expect(source).toContain("CARD_COLUMN_TOO_NARROW");
  expect(source).toContain("TOO_MANY_CARD_COLUMNS");
  expect(source).toContain("TOUCH_TARGET_TOO_SMALL");
  expect(source).toContain("ACTION_OVERLAP");
  expect(source).toContain("MOBILE_MEDIA_TEXT_NOT_STACKED");
  expect(source).toContain("root.scrollWidth > root.clientWidth + 3");
  expect(source).toContain("const allowedColumns = mobile ? 2 : tablet ? 3 : 4");
  expect(source).toContain("const safeCardWidth = mobile ? 148 : tablet ? 180 : 210");
});

test("dental runtime certification gates every mobile tablet desktop candidate on composition", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");

  expect(certifier).toContain('measureResponsiveCompositionIssues(documentRoot, target.width)');
  expect(certifier).toContain('compositionIssues.some((issue) => issue.severity === "error")');
  expect(certifier).toContain('composition:${issue.code}:${issue.detail}');
  expect(certifier).toContain('{ viewport: "mobile" as const, width: 390');
  expect(certifier).toContain('{ viewport: "tablet" as const, width: 768');
  expect(certifier).toContain('{ viewport: "desktop" as const, width: 1440');

  const typographyPosition = certifier.indexOf("const typographyIssues");
  const compositionPosition = certifier.indexOf("const compositionIssues");
  const advancePosition = certifier.indexOf("if (targetIndex < TARGETS.length - 1)");
  expect(typographyPosition).toBeGreaterThan(-1);
  expect(compositionPosition).toBeGreaterThan(typographyPosition);
  expect(advancePosition).toBeGreaterThan(compositionPosition);
});

test("composition QA tolerates editorial variation while enforcing responsive safety", () => {
  const source = readFileSync("apps/builder/app/rendered-responsive-composition-quality.ts", "utf8");

  expect(source).toContain("rect.width < rootRect.width * 0.985");
  expect(source).toContain("const minGutter = mobile ? 12 : tablet ? 18 : 24");
  expect(source).toContain("if (mobile || tablet)");
  expect(source).toContain("if (mobile) {");
  expect(source).not.toContain("font-family");
  expect(source).not.toContain("innerHTML =");
}
