import { defineConfig } from "@playwright/test";

/**
 * Product-chrome QA runs against the Builder itself, not the generated-site
 * preview application used by the default Playwright configuration.
 */
export default defineConfig({
  testDir: ".",
  testMatch: [
    "builder-product-chrome.spec.ts",
    "builder-onboarding.spec.ts",
    "builder-first-build-review.spec.ts",
    "builder-editor-shell.spec.ts",
    "physiotherapy-editor-interaction.spec.ts",
  ],
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  // Keep this harness from clearing visual artifacts produced by the generated-
  // site gates, which also live under the repository-level test-results folder.
  outputDir: "../test-results/builder-product-chrome-playwright",
  use: {
    baseURL: "http://localhost:3000",
    ...(process.env.MI_QA_CHROMIUM_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.MI_QA_CHROMIUM_EXECUTABLE_PATH,
          },
        }
      : {}),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command:
      "pnpm --filter @micirql/builder build && pnpm --filter @micirql/builder start",
    url: "http://localhost:3000",
    reuseExistingServer: process.env.MI_QA_REUSE_BUILDER_SERVER === "1",
    timeout: 300_000,
  },
});
