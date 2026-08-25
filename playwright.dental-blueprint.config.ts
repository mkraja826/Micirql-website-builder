import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa",
  // Keep Playwright-owned artifacts separate from the durable certification
  // evidence written by dental-blueprint-qa.ts under test-results/.
  outputDir: "playwright-results/dental-blueprint",
  // qa:dental-blueprint passes an explicit file list. Keep the config broad so
  // those quality layers are not silently filtered out by an older filename-only
  // match rule as the certification pipeline grows.
  testMatch: /.*\.spec\.ts/,
  // The first three legacy specs pre-date the shared exact-viewport harness.
  // Their coverage now lives in dental-layout-blueprint-00.spec.ts so all 20
  // layouts are certified through the same viewport and evidence pipeline.
  testIgnore: [
    /dental-layout-blueprint\.spec\.ts/,
    /dental-layout-blueprint-0[23]\.spec\.ts/,
  ],
  timeout: 180_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-key MICIRQL_DRAFT_STORE=supabase pnpm --filter @micirql/builder dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @micirql/preview dev",
      url: "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});