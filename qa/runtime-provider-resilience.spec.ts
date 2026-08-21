import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { textProviderConfigFromEnvironment } from "@micirql/ai";

const root = process.cwd();
const pexels = fs.readFileSync(path.join(root, "apps/builder/app/pexels-stock-image.ts"), "utf8");

test("Gemini fallback uses the current 3.1 Flash-Lite model with enough output budget", () => {
  const config = textProviderConfigFromEnvironment({ GEMINI_API_KEY: "test-key" });
  expect(config).toBeTruthy();
  expect(config?.model).toBe("gemini-3.1-flash-lite");
  expect(config?.maxOutputTokens).toBe(8_000);
  expect(config?.pricing.inputUsdPerMillionTokens).toBe(0.25);
  expect(config?.pricing.outputUsdPerMillionTokens).toBe(1.5);
});

test("Pexels media fetch retries transient Cloudflare 52x failures", () => {
  for (const status of [520, 521, 522, 523, 524, 525, 526, 527]) {
    expect(pexels).toContain(String(status));
  }
  expect(pexels).toContain("const MAX_ATTEMPTS = 4");
  expect(pexels).toContain("error code:\\s*52[0-7]");
});
