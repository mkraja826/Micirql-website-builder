import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa",
  testMatch: /(?:dental-visual-comparison|dental-top20-premium-gate|dental-top20-visual-evidence|dental-flagship-visual-evidence|dental-flagship-mobile-navigation|dental-top20-geometry-gate|dental-runtime-css-parity|dental-production-certification-gate|dental-rendered-interaction-certification|live-rendered-interaction-parity|live-functional-interaction-certification|gallery-lightbox-certification|faq-accordion-certification|dental-faq-generation-intelligence|faq-structured-data-parity|dental-multipage-architecture|dental-multipage-media-safety|dental-breadcrumb-structured-data|dental-multipage-live-routing|dental-interaction-allowlist-gate)\.spec\.ts/,
  timeout: 240_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-key MICIRQL_DRAFT_STORE=supabase pnpm --filter @micirql/builder dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
