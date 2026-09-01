import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("apps/builder/app/brand-kit.tsx", "utf8");

test("Brand Kit uses the visible logo preference label for its group name", () => {
  assert.match(source, /id="brand-logo-preference-label">When replacing the logo<\/span>/);
  assert.match(source, /className=\{styles\.preference\} role="group" aria-labelledby="brand-logo-preference-label"/);
  assert.doesNotMatch(source, /aria-label="Logo color preference"/);
});
