import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("Ask MiCirql errors are announced as alerts", () => {
  assert.match(source, /className=\{styles\.error\} role="alert"/);
});
