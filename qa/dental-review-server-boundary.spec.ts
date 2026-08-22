import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const review = fs.readFileSync(path.join(root, "apps/builder/app/first-build-review.tsx"), "utf8");
const route = fs.readFileSync(path.join(root, "apps/builder/app/api/review-directions/dental/route.ts"), "utf8");
const generator = fs.readFileSync(path.join(root, "apps/builder/app/dental-review-directions.ts"), "utf8");

test("Dental review candidates are generated server-side so the runtime allowlist never depends on browser env", () => {
  expect(review).toContain('fetch("/api/review-directions/dental"');
  expect(review).not.toContain("buildCertifiedDentalReviewDirections(");
  expect(review).not.toContain("MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS");

  expect(route).toContain("getSupabaseDraft(request, workspaceId, siteId)");
  expect(route).toContain("buildCertifiedDentalReviewDirections(");
  expect(route).not.toContain("MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS");

  expect(generator).toContain("runtimeRenderedCertifiedDentalIds()");
  expect(generator).toContain("process.env.MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS");
  expect(generator).toContain('process.env.NODE_ENV === "production" && renderedCertifiedIds.size === 0');
});

test("Dental review keeps rendered browser certification after server-side candidate filtering", () => {
  expect(review).toContain("DentalReviewRenderCertifier");
  expect(review).toContain("serverDentalPoolLoaded");
  expect(review).toContain("setCertifiedDentalPool(passed)");
  expect(review).toContain("These directions did not pass rendered review.");
});
