import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

assert.match(source, /<div className=\{styles\.proposalCopy\} role="status">/);
assert.match(source, /MiCirql proposal/);
assert.match(source, /Safe fallback/);

console.log("ai editor proposal status QA passed");
