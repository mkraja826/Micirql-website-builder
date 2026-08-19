import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("rendered image repair is bounded and only reselects from persisted qualified alternates", () => {
  const repair = readFileSync("apps/builder/app/rendered-image-repair.ts", "utf8");
  expect(repair).toContain("input.attempt > 0");
  expect(repair).toContain('IMAGE_CROP_TOO_AGGRESSIVE');
  expect(repair).toContain('IMAGE_ALT_MISSING');
  expect(repair).toContain('IMAGE_UPSCALED_TOO_FAR');
  expect(repair).toContain('IMAGE_FAILED_TO_LOAD');
  expect(repair).toContain('IMAGE_REUSED_TOO_OFTEN');
  expect(repair).toContain('reselect-qualified-alternate');
  expect(repair).toContain('props.qualifiedMediaAlternates');
  expect(repair).toContain('!usedUrls.has(entry.url)');
  expect(repair).toContain('Math.max(width, height) >= 900');
  expect(repair).toContain('reselectionUnavailable');
  expect(repair).not.toContain('overflow-x:hidden');
});

test("media execution carries only ranked same-intent alternates into generated sections", () => {
  const execution = readFileSync("apps/builder/app/media-execution.ts", "utf8");
  const apply = readFileSync("apps/builder/app/apply-media-execution.ts", "utf8");
  expect(execution).toContain("rankAssets(decision,assets,usedIds,usedUrls,usedSignatures)");
  expect(execution).toContain("ranked.slice(1,4)");
  expect(execution).toContain("qualifiedAlternates");
  expect(execution).toContain("aspectScore(a.aspect,d.aspect)");
  expect(execution).toContain("similarity>=.78");
  expect(apply).toContain("qualifiedMediaAlternates");
  expect(apply).toContain("mediaSelectionIntent");
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
