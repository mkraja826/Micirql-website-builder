import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("responsive proposal review does not auto-apply AI edits", () => {
  expect(assistant).toContain("MiCirql proposes a safe structured edit first—you decide whether to apply it.");
  expect(assistant).toContain("onClick={apply}");
  expect(assistant).not.toContain("useEffect(() => apply");
});
