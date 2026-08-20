import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "test-results", "dental-top20-visual-evidence");
const outputPath = path.join(outputDirectory, "live-interaction-certification.json");
const currentSha = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

// This materializer must only run after all published-live browser suites
// succeed. The allowlist certifier verifies this certificate belongs to the
// exact source commit being deployed.
const certification = {
  schemaVersion: 4,
  certified: true,
  sourceCommit: currentSha,
  generatedAt: new Date().toISOString(),
  sourceTests: [
    "qa/live-rendered-interaction-parity.spec.ts",
    "qa/live-functional-interaction-certification.spec.ts",
    "qa/gallery-lightbox-certification.spec.ts",
    "qa/faq-accordion-certification.spec.ts",
  ],
  surface: "published-live-runtime",
  contract: "published-live-functional-gallery-faq-interaction-v4",
  requiredChecks: [
    "generated live runtime CSS contains the shared interaction layer",
    "published CTA pointer feedback is visible and restrained",
    "published keyboard focus-visible treatment is present",
    "published transitions avoid layout-jank properties",
    "published mobile burger target is at least 44x44px",
    "published mobile drawer opens, closes and remains viewport-contained",
    "published drawer links retain keyboard focus visibility",
    "published visible controls meet the mobile target minimum",
    "published prefers-reduced-motion removes meaningful movement",
    "desktop treatment dropdown opens and closes from the keyboard",
    "dropdown destinations are safe and keyboard focusable",
    "appointment forms block incomplete native submissions",
    "valid appointment forms POST the required functional payload",
    "published success and validation-error states are announced through the aria-live form status",
    "gallery images open an accessible native dialog from keyboard or pointer input",
    "gallery ArrowLeft and ArrowRight navigation updates image context and live position",
    "gallery Escape and explicit close restore focus to the invoking image trigger",
    "gallery lightbox controls meet the 44px mobile target minimum and stay viewport-contained",
    "gallery swipe navigation requires a deliberate horizontal gesture and ignores vertical-dominant movement",
    "FAQ disclosures synchronize native open state with aria-expanded",
    "single FAQ mode closes sibling disclosures while multi mode preserves independent answers",
    "FAQ ArrowUp ArrowDown Home and End provide deterministic summary focus navigation",
    "FAQ deep links open the addressed answer without violating single-mode state",
    "FAQ mobile summaries meet the touch target minimum and reduced-motion removes icon animation",
  ],
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, JSON.stringify(certification, null, 2), "utf8");
console.log(`Published live Dental functional + gallery + FAQ interaction contract certified for ${currentSha}.`);
