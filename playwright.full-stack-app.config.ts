import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./qa",
  testMatch: /(?:full-stack-app-certification|full-stack-runtime-probe-executor)\.spec\.ts/,
  timeout: 15_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
});
