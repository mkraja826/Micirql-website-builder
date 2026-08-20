import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const architectRoute = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/architect/route.ts"), "utf8");

test("architect success is gated by dental specialty content quality", () => {
  expect(architectRoute).toContain('evaluateDentalContentQuality');
  expect(architectRoute).toContain('MIN_DENTAL_CONTENT_SCORE = 82');
  expect(architectRoute).toContain('function dentalContentNeedsRepair');
  expect(architectRoute).toContain('result.issues.some((item) => item.severity === "error") || result.score < MIN_DENTAL_CONTENT_SCORE');
  expect(architectRoute).toContain('dentalContentNeedsRepair(dentalContentQuality)');
  expect(architectRoute).toContain('GENERATED_DENTAL_CONTENT_QUALITY_FAILED_AFTER_REPAIR');
  expect(architectRoute).toContain('dentalContentQuality?.score ?? 100');
  expect(architectRoute).toContain('dentalContentQuality');
  expect(architectRoute).toContain('visualQuality');
});

test("architect only applies the specialty gate to dental briefs", () => {
  expect(architectRoute).toContain('if (isDentalBrief(facts))');
  expect(architectRoute).toMatch(/dental\|dentist\|dentistry\|orthodont\|endodont\|implant/);
});
