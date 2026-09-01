import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("apps/builder/app/brand-kit.tsx", "utf8");

test("Brand Kit uses the visible Brand history label for its group name", () => {
  assert.match(source, /id="brand-history-label">Brand history<\/span>/);
  assert.match(source, /className=\{styles\.history\} role="group" aria-labelledby="brand-history-label"/);
  assert.doesNotMatch(source, /className=\{styles\.history\} role="group" aria-label="Brand history"/);
});
