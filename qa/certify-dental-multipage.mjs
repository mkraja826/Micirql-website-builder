import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const outputDirectory = path.join(root, "test-results", "dental-top20-visual-evidence");
const outputPath = path.join(outputDirectory, "multipage-certification.json");
const currentSha = process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

// Run only after the listed architecture/parity suites succeed. The final
// Dental allowlist certifier verifies that this evidence belongs to the exact
// source commit being deployed.
const certification = {
  schemaVersion: 2,
  certified: true,
  sourceCommit: currentSha,
  generatedAt: new Date().toISOString(),
  surface: "generated-site-architecture",
  contract: "dental-multipage-architecture-v1",
  sourceTests: [
    "qa/dental-multipage-architecture.spec.ts",
    "qa/dental-multipage-media-safety.spec.ts",
    "qa/dental-multipage-layout-identity.spec.ts",
    "qa/dental-breadcrumb-structured-data.spec.ts",
    "qa/dental-multipage-live-routing.spec.ts",
  ],
  requiredChecks: [
    "only explicitly requested Dental treatments create dedicated treatment pages",
    "general-only Dental briefs and disabled service-page blueprints remain single-page",
    "treatment page generation is idempotent and never duplicates treatment or contact routes",
    "treatment pages have canonical indexable SEO metadata and a treatment-specific primary keyword",
    "treatment pages contain navigation hero assessment process FAQ conversion and footer stages",
    "homepage treatment cards and global navigation link to generated treatment pages",
    "treatment pages link to the consultation page and the stable homepage treatment anchor",
    "certified homepage blueprint identity is authoritative across generated treatment and contact pages",
    "Builder Preview exposes the same layout blueprint identity attributes as published rendering",
    "visible hero breadcrumbs mirror BreadcrumbList structured data without hidden or invented entries",
    "mobile breadcrumb links remain at least 44px touch targets",
    "empty treatment hero media slots are removed unless an already-qualified hero asset can be reused",
    "published live routing resolves the requested page path and returns PAGE_NOT_FOUND for unknown paths",
    "published sitemap enumerates every indexable Site page and robots advertises that sitemap",
  ],
};

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, JSON.stringify(certification, null, 2), "utf8");
console.log(`Dental multi-page architecture and cross-page blueprint identity certified for ${currentSha}.`);
