import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Dental rendered review preserves exact failure diagnostics and handles non-JSON upstream responses", () => {
  const review = readFileSync("apps/builder/app/first-build-review.tsx", "utf8");

  expect(review).toContain("dentalCertificationResults");
  expect(review).toContain("setDentalCertificationResults(results)");
  expect(review).toContain("data-mi-dental-render-failure-summary");
  expect(review).toContain("result.failures.slice(0, 3)");
  expect(review).toContain("readDentalDirectionsPayload(response)");
  expect(review).toContain('response.headers.get("content-type")');
  expect(review).toContain("Dental review service returned a non-JSON response");
  expect(review).not.toContain("const payload = await response.json() as DentalDirectionsPayload");
});
