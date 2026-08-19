import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("rendered image quality measures intrinsic resolution, crop pressure and reuse", () => {
  const quality = readFileSync("apps/builder/app/rendered-image-quality.ts", "utf8");

  expect(quality).toContain("IMAGE_FAILED_TO_LOAD");
  expect(quality).toContain("IMAGE_UPSCALED_TOO_FAR");
  expect(quality).toContain("IMAGE_CROP_TOO_AGGRESSIVE");
  expect(quality).toContain("IMAGE_REUSED_TOO_OFTEN");
  expect(quality).toContain("image.naturalWidth");
  expect(quality).toContain("image.naturalHeight");
  expect(quality).toContain('style.objectFit === "cover"');
  expect(quality).toContain("srcCounts");
});

test("dental runtime certification gates every viewport on rendered image quality", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");

  expect(certifier).toContain('measureRenderedImageQualityIssues(documentRoot, target.width)');
  expect(certifier).toContain('issue.severity === "error"');
  expect(certifier).toContain('`image:${issue.code}:${issue.detail}`');
  expect(certifier.indexOf("measureRenderedImageQualityIssues")).toBeLessThan(certifier.indexOf("setTargetIndex((value) => value + 1)"));
});

test("image quality does not hide low-resolution defects with CSS", () => {
  const quality = readFileSync("apps/builder/app/rendered-image-quality.ts", "utf8");
  expect(quality).not.toContain("overflow-x:hidden");
  expect(quality).not.toContain("filter:blur");
  expect(quality).not.toContain("image-rendering");
});
