import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const url = process.env.MICIRQL_BENCHMARK_URL ?? "http://127.0.0.1:3000/generated/pearl/candidates";
const outputDir = path.resolve("artifacts/section-archetype-usage");
const requiredArchetypes = [
  "services-featured-offer",
  "about-manifesto-columns",
  "process-editorial-steps",
  "cta-decision-panel",
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await page.goto(url, { waitUntil: "networkidle" });

  const candidates = await page.locator("article[data-candidate-id]").evaluateAll((nodes) => nodes.map((node) => ({
    id: node.getAttribute("data-candidate-id"),
    selectedSections: JSON.parse(node.getAttribute("data-selected-sections") || "{}"),
    sectionOrder: (node.getAttribute("data-section-order") || "").split(",").filter(Boolean),
  })));

  if (candidates.length !== 20) {
    throw new Error(`Expected 20 benchmark candidates, found ${candidates.length}`);
  }

  const usage = {};
  for (const candidate of candidates) {
    for (const sectionId of Object.values(candidate.selectedSections)) {
      usage[sectionId] = (usage[sectionId] ?? 0) + 1;
    }
  }

  const missingRequiredArchetypes = requiredArchetypes.filter((id) => !usage[id]);
  const uniqueSectionIds = Object.keys(usage).sort();
  const report = {
    generatedAt: new Date().toISOString(),
    candidateCount: candidates.length,
    requiredArchetypes,
    missingRequiredArchetypes,
    uniqueSectionCount: uniqueSectionIds.length,
    usage: Object.fromEntries(uniqueSectionIds.map((id) => [id, usage[id]])),
    candidates,
  };

  await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ uniqueSectionCount: report.uniqueSectionCount, usage: report.usage, missingRequiredArchetypes }, null, 2));

  if (missingRequiredArchetypes.length) {
    throw new Error(`Universal section archetype coverage failed: ${missingRequiredArchetypes.join(", ")} were never selected across the 20 candidates`);
  }
} finally {
  await browser.close();
}
