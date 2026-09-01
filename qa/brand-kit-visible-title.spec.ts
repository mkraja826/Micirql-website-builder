import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("apps/builder/app/brand-kit.tsx", "utf8");

test("Brand Kit section uses its visible title as the accessible name", () => {
  assert.match(source, /className=\{styles\.kit\} aria-labelledby="brand-kit-title"/);
  assert.match(source, /id="brand-kit-title">Brand Kit<\/span>/);
  assert.doesNotMatch(source, /aria-label="Brand Kit"/);
});
