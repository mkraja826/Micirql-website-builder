import { expect, test } from "@playwright/test";
import fs from "node:fs";

const assistant = fs.readFileSync("apps/builder/app/ai-editor-assistant.tsx", "utf8");

test("responsive visual review stays before proposal actions", () => {
  const visual = assistant.indexOf("<AiEditVisualPreview");
  const actions = assistant.indexOf("className={styles.proposalActions}");
  expect(visual).toBeGreaterThan(-1);
  expect(visual).toBeLessThan(actions);
});
