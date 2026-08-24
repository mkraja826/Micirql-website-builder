import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("Dental rendered review remains observable and handles non-JSON upstream responses without blocking review", () => {
  const review = readFileSync("apps/builder/app/first-build-review.tsx", "utf8");

  expect(review).toContain("dentalCertificationResults");
  expect(review).toContain("setDentalCertificationResults(results)");
  expect(review).toContain("const DENTAL_BACKGROUND_RENDER_LIMIT = 3");
  expect(review).toContain("const dentalProbePool");
  expect(review).toContain("const pool = rawPool");
  expect(review).toContain("background rendered check");
  expect(review).toContain("readDentalDirectionsPayload(response)");
  expect(review).toContain('response.headers.get("content-type")');
  expect(review).toContain("Dental review service returned a non-JSON response");
  expect(review).not.toContain("const payload = await response.json() as DentalDirectionsPayload");
});
