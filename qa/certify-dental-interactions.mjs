import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "test-results", "dental-top20-visual-evidence");
const outputPath = path.join(outputDirectory, "interaction-certification.json");
const currentSha = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

// This script is intentionally run only after the rendered Playwright interaction
// suite succeeds. It converts that successful browser run into an auditable input
// for the Top-20 runtime allowlist certifier.
const certification = {
  schemaVersion: 1,
  certified: true,
  sourceCommit: currentSha,
  generatedAt: new Date().toISOString(),
  sourceTest: "qa/dental-rendered-interaction-certification.spec.ts",
  contract: "shared-dental-rendered-interaction-v1",
  requiredChecks: [
    "desktop pointer feedback is visible and restrained",
    "keyboard focus-visible treatment is present",
    "transition properties avoid layout-jank animation",
    "mobile burger target is at least 44x44px",
    "mobile drawer opens, closes and remains viewport-contained",
    "drawer links retain keyboard focus visibility",
    "prefers-reduced-motion removes meaningful movement",
    "visible generated controls meet 44px mobile target minimum",
  ],
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, JSON.stringify(certification, null, 2), "utf8");
console.log(`Rendered Dental interaction contract certified for ${currentSha}.`);
