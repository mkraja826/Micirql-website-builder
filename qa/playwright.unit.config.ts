import { defineConfig } from "@playwright/test";

// Pure contract tests do not need the preview application. Keeping them off
// the shared preview port also makes Edge Function policy checks deterministic
// while visual QA is running in parallel.
export default defineConfig({
  testDir: ".",
  timeout: 45_000,
  fullyParallel: true,
  retries: 0,
  reporter: "list",
});
