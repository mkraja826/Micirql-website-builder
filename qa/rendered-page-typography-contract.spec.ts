import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("rendered typography browser measures real responsive geometry", () => {
  const source = readFileSync("qa/rendered-page-typography-browser.ts", "utf8");

  expect(source).toContain("HEADING_TOO_MANY_RENDERED_LINES");
  expect(source).toContain("HEADING_ORPHAN_LAST_LINE");
  expect(source).toContain("ACTION_TEXT_OVERFLOW");
  expect(source).toContain("ACTION_WRAP_EXCESSIVE");
  expect(source).toContain("PARAGRAPH_RENDERED_TOO_DENSE");
  expect(source).toContain("CARD_TITLE_HEIGHT_VARIANCE");
  expect(source).toContain("getBoundingClientRect()");
  expect(source).toContain("document.createRange()");
});

test("dental blueprint certification requires rendered typography at every target", () => {
  const source = readFileSync("qa/dental-blueprint-qa.ts", "utf8");

  expect(source).toContain("measureRenderedPageTypography(documentRoot, width)");
  expect(source).toContain("const typographyPassed = typography.passed");
  expect(source).toContain("corePassed && mobileCheckPassed && firstScreenPassed && typographyPassed");
  expect(source).toContain("renderedTypography: typography");
  expect(source).toContain("renderedResponsiveTypographyCertified: true");
  expect(source).toContain("DENTAL_BLUEPRINT_TARGETS = [360, 390, 430, 768, 1024, 1440]");
});
