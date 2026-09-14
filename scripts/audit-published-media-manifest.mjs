import fs from "node:fs";

const schema = fs.readFileSync("src/core/publish/schema.ts", "utf8");
const planner = fs.readFileSync("src/core/publish/planner.ts", "utf8");
const materialized = fs.readFileSync("src/core/materialization/schema.ts", "utf8");
const materializer = fs.readFileSync("src/core/materialization/materializer.ts", "utf8");

const failures = [];

if (!schema.includes("export type PublishableMediaAsset")) failures.push("publish schema is missing PublishableMediaAsset");
if (!schema.includes("media: PublishableMediaAsset[]")) failures.push("publishable draft does not persist media manifest");
if (!planner.includes("media?: PublishableMediaAsset[]")) failures.push("publish planner cannot accept resolved media");
if (!planner.includes("media: normalizedMedia")) failures.push("publish planner does not carry normalized media");
if (!materialized.includes('media: PublishableDraft["media"]')) failures.push("materialized snapshot omits publishable media");
if (!materializer.includes("media: deepClone(draft.media)")) failures.push("materializer does not clone media into immutable snapshot");
if (!materializer.includes("hasPersistedMediaManifest")) failures.push("hydration does not validate persisted media manifest");
if (!materializer.includes("snapshot?.media")) failures.push("media manifest is not part of hydration validation");

if (failures.length) {
  console.error("Published media manifest audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Published media manifest audit passed.");
