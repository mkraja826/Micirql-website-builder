import fs from "node:fs";

const file = "src/rendering/published-snapshot.tsx";
const source = fs.readFileSync(file, "utf8");
const required = [
  'snapshot.snapshot.content.pages.find',
  'snapshot.snapshot.pages.find',
  'snapshot.snapshot.selectedSections',
  'snapshot.snapshot.media',
  'snapshot.snapshot.cssVariables',
  'snapshot.snapshot.theme',
  'snapshot.snapshot.capabilities',
  'buildPublishedRequestAction(runtime',
  'persistedPage.sectionOrder.map',
];
for (const token of required) {
  if (!source.includes(token)) throw new Error(`Published snapshot renderer is missing required persisted input: ${token}`);
}
const forbidden = [
  "directContent(",
  "generateMultiIndustryBenchmarkMatrix(",
  "generatePearl",
  "resolveMultiIndustryBenchmarkMedia(",
  "resolvePearlHeroMedia(",
  "resolveMedia(",
  "fetch(",
];
for (const token of forbidden) {
  if (source.includes(token)) throw new Error(`Published snapshot renderer must not regenerate or perform live provider lookup: ${token}`);
}
if (!source.includes('if (!persistedPage || !contentPage) return null;')) {
  throw new Error("Published snapshot renderer must fail closed when persisted page/content is missing.");
}
console.log("Published snapshot renderer boundary audit passed.");
