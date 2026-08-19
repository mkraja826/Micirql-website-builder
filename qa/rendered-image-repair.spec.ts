import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("rendered image repair is bounded and only fixes safe presentation metadata", () => {
  const repair = readFileSync("apps/builder/app/rendered-image-repair.ts", "utf8");
  expect(repair).toContain("input.attempt > 0");
  expect(repair).toContain('IMAGE_CROP_TOO_AGGRESSIVE');
  expect(repair).toContain('IMAGE_ALT_MISSING');
  expect(repair).toContain('props.imageFit = "contain"');
  expect(repair).toContain('props.imageFocalPoint = "center"');
  expect(repair).not.toContain('overflow-x:hidden');
  expect(repair).not.toContain('IMAGE_UPSCALED_TOO_FAR\") operations.add');
  expect(repair).not.toContain('IMAGE_FAILED_TO_LOAD\") operations.add');
});

test("image QA issues carry section targeting metadata for deterministic repair", () => {
  const quality = readFileSync("apps/builder/app/rendered-image-quality.ts", "utf8");
  expect(quality).toContain("sectionId?: string");
  expect(quality).toContain("src?: string");
  expect(quality).toContain('closest<HTMLElement>("[data-mi-section-id]")');
});

test("Dental Review performs at most one rendered image repair before rejection", () => {
  const certifier = readFileSync("apps/builder/app/dental-review-render-certifier.tsx", "utf8");
  expect(certifier).toContain("const [imageAttempt, setImageAttempt] = useState<0 | 1>(0)");
  expect(certifier).toContain("planRenderedImageRepair({ issues: imageIssues, attempt: imageAttempt })");
  expect(certifier).toContain("imageAttempt === 0 && plan.required");
  expect(certifier).toContain("applyRenderedImageRepair(current.site, plan)");
  expect(certifier).toContain("setImageAttempt(1)");
  expect(certifier).toContain("setImageAttempt(0)");
});
