import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("responsive device controls only exist when a visual proposal site exists", () => {
  const guard = visual.indexOf("{proposal.site ? <>");
  const controls = visual.indexOf("VIEWPORTS.map");
  const renderer = visual.indexOf("<RendererPreview");
  expect(guard).toBeGreaterThan(-1);
  expect(controls).toBeGreaterThan(guard);
  expect(renderer).toBeGreaterThan(controls);
});
