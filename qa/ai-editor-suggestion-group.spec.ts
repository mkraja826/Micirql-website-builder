import { test, expect } from "@playwright/test";

test("Ask MiCirql suggestions use their visible context label as the group name", async ({ page }) => {
  const source = await page.request.get("/app/ai-editor-assistant.tsx");
  const text = await source.text();
  expect(text).toContain('className={styles.suggestionGroup} role="group" aria-labelledby="ai-editor-suggestions-label"');
  expect(text).toContain('id="ai-editor-suggestions-label" className={styles.groupLabel}');
});
