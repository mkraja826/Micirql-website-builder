import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa",
  testMatch: [
    "dental-diversity-benchmark.spec.ts",
    "design-diversity-fingerprint.spec.ts",
    "design-theme-family-diversity.spec.ts",
    "design-genome-diversity.spec.ts",
    "review-direction-certification.spec.ts",
    "dental-blueprint-application.spec.ts",
    "dental-planner-contract.spec.ts",
    "dental-media-execution.spec.ts",
  ],
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
});
