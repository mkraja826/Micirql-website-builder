import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const guided = read("apps/builder/app/guided-onboarding.tsx");
const gate = read("apps/builder/app/onboarding-gate.tsx");
const interpret = read("apps/builder/app/api/onboarding/interpret/route.ts");
const composition = read("apps/builder/app/apply-composition.ts");
const renderer = read("packages/renderer/src/render.tsx");
const implantCss = read("packages/sections/src/dental-02-implant-atelier.css");

assert.match(guided, /selectedLayoutId:\s*string/);
assert.match(guided, /selectedLayoutId:\s*recommendation\?\.id\s*\?\?\s*""/);
assert.match(guided, /subindustry:\s*recommendation\?\.preferredSubindustry\s*\|\|\s*asText\(profile\.subindustry\)/);
assert.match(guided, /selectedLayoutId:\s*designMatch\.id/);

assert.match(interpret, /preferredSubindustry:\s*item\.layout\.fit\.subindustryIds\.length\s*===\s*1/);
assert.match(gate, /selectedLayoutId:\s*value\.selectedLayoutId/);
assert.match(gate, /payload\?\.selectedLayout\?\.id\s*!==\s*value\.selectedLayoutId/);

assert.match(composition, /applyWebsiteLayoutBlueprint\(preparedSite,\s*candidate\.layout\)/);
assert.match(renderer, /props\.layoutBlueprintId/);
assert.match(renderer, /data-mi-layout-blueprint=\{layoutBlueprintId\}/);
assert.match(implantCss, /data-mi-layout-blueprint="dental-02-implant-luxury"/);

console.log("Onboarding layout continuity contract passed.");
