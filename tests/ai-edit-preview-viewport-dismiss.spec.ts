import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("proposal remains dismissible after checking multiple devices", () => {
  expect(assistant).toContain('onClick={() => setProposal(undefined)}>Not now</button>');
});
