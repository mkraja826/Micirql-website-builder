import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa",
  testMatch: /(?:backend-implementation-contract|supabase-migration-generator|supabase-migration-certification|supabase-staging-executor|supabase-management-provider)\.spec\.ts/,
  timeout: 15_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
});
