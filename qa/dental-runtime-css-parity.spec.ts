import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const repoRoot = process.cwd();
const builderLayoutPath = path.join(repoRoot, "apps", "builder", "app", "layout.tsx");
const sectionRoot = path.join(repoRoot, "packages", "sections", "src");

const SHARED_AFTER_DENTAL = [
  "dental-responsive-safety.css",
  "premium-output-system.css",
  "premium-geometry.css",
] as const;

function builderSectionCssOrder(source: string) {
  const matches = [...source.matchAll(/import\s+"@micirql\/sections\/([^"\n]+\.css)";/g)].map((match) => match[1]);
  return matches.filter((name) =>
    name === "dental-layout-blueprints.css" ||
    /^dental-\d{2}-.*\.css$/.test(name) ||
    SHARED_AFTER_DENTAL.includes(name as (typeof SHARED_AFTER_DENTAL)[number]),
  );
}

async function expectedLiveOrder() {
  const allDental = (await readdir(sectionRoot)).filter((name) => /^dental-\d{2}-.*\.css$/.test(name));
  const baseDental = allDental.filter((name) => !name.endsWith("-refinement.css")).sort();
  const refinements = allDental.filter((name) => name.endsWith("-refinement.css")).sort((a, b) => {
    const aMatch = a.match(/^dental-(\d{2})-/);
    const bMatch = b.match(/^dental-(\d{2})-/);
    const byNumber = Number(aMatch?.[1] ?? 0) - Number(bMatch?.[1] ?? 0);
    return byNumber || a.localeCompare(b);
  });
  return ["dental-layout-blueprints.css", ...baseDental, ...SHARED_AFTER_DENTAL, ...refinements];
}

test("builder and live runtime keep the same Dental CSS cascade order", async () => {
  const builderLayout = await readFile(builderLayoutPath, "utf8");
  const builderOrder = builderSectionCssOrder(builderLayout);
  const liveOrder = await expectedLiveOrder();

  expect(builderOrder, "Builder Dental CSS imports must exactly match the live runtime cascade order").toEqual(liveOrder);

  const refinementIndexes = liveOrder
    .map((name, index) => ({ name, index }))
    .filter(({ name }) => name.endsWith("-refinement.css"));
  const sharedTailIndex = Math.max(...SHARED_AFTER_DENTAL.map((name) => liveOrder.indexOf(name)));
  for (const refinement of refinementIndexes) {
    expect(refinement.index, `${refinement.name} must load after shared responsive/premium layers`).toBeGreaterThan(sharedTailIndex);
    const basePrefix = refinement.name.replace(/-refinement\.css$/, "");
    const matchingBase = liveOrder.find((name) => !name.endsWith("-refinement.css") && name.startsWith(basePrefix.replace(/-(?:premium|proof-first|clinical-authority|family-care|digital-dentistry|ortho-journey|immediate-care|implant-results|calm-dentistry|smile-campaign|multi-specialty-hub|quiet-precision|complete-signature)$/, "")));
    if (matchingBase) expect(refinement.index).toBeGreaterThan(liveOrder.indexOf(matchingBase));
  }
});
