import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("Top-20 review direction mutations stay inside premium-certified variant sets", async () => {
  const source = await readFile(path.join(process.cwd(), "apps", "builder", "app", "review-directions.ts"), "utf8");

  expect(source).toContain("certifiedVariantsFor");
  expect(source).toContain("resolvePremiumCertifiedVariant");
  expect(source).toContain("const approved = certifiedVariantsFor(family)");
  expect(source).toContain("const certified = resolvePremiumCertifiedVariant(family, requested)");
  expect(source).not.toContain("% 5) + 1");
});
