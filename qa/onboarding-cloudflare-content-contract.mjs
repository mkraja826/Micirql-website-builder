import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const onboarding = fs.readFileSync(path.join(root, "apps/builder/app/api/onboarding/route.ts"), "utf8");

assert.match(onboarding, /runGuardedContentGeneration/, "onboarding must call the guarded Builder content service");
assert.doesNotMatch(onboarding, /functions\/v1\/enrich-site-content/, "first-build onboarding must not bypass Workers AI via the legacy Supabase content edge function");
assert.match(onboarding, /expectedRevision:\s*builtDraft\.revision/, "onboarding content generation must preserve draft revision safety");
assert.match(onboarding, /businessName:\s*lockedBrief\.businessName/, "onboarding must ground generated copy in the locked business brief");
assert.match(onboarding, /groundingIssueCount/, "onboarding must expose factual grounding audit results");

console.log("Onboarding guarded content contract verified.");
