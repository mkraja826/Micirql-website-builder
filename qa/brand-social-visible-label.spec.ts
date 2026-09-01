import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("apps/builder/app/brand-kit.tsx", "utf8");

test("Brand Kit uses the visible social share card label for its group name", () => {
  assert.match(source, /id="brand-social-card-label">Social share card<\/span>/);
  assert.match(source, /className=\{styles\.social\} role="group" aria-labelledby="brand-social-card-label"/);
  assert.doesNotMatch(source, /aria-label="Social share card preview"/);
});
