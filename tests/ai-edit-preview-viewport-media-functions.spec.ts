import { expect, test } from "@playwright/test";
import fs from "node:fs";

const materializer = fs.readFileSync("apps/builder/app/ai-edit-proposed-site.ts", "utf8");

test("Media and Functions proposals do not fabricate responsive canvas states", () => {
  expect(materializer).toContain("MiCirql will open Media before any image is changed.");
  expect(materializer).toContain("MiCirql will open Functions before any action is changed.");
});
