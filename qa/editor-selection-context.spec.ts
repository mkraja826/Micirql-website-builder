import { expect, test } from "@playwright/test";
import fs from "node:fs";

const css = fs.readFileSync("apps/builder/app/section-controls.module.css", "utf8");

test("selected section is unmistakably marked as the active edit context", () => {
  expect(css).toContain('.layer.active::after{content:"Editing"');
  expect(css).toContain("box-shadow:inset 3px 0 #9b6cff");
  expect(css).toContain(".layer.active .index");
  expect(css).toContain(".layer.active small");
});

test("selection context remains compact on small screens", () => {
  expect(css).toContain("@media(max-width:520px)");
  expect(css).toContain(".layer.active{padding-right:62px}");
});
