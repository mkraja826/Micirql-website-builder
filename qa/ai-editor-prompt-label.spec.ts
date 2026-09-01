import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("Ask MiCirql prompt has a persistent accessible name", () => {
  assert.match(source, /<textarea\s+aria-label="Ask MiCirql edit request"/);
  assert.match(source, /placeholder=\{sectionId \? "Ask MiCirql to change this section…" : "Ask MiCirql to improve this page…"\}/);
});
