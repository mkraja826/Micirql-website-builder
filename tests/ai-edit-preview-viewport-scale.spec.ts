import { expect, test } from "@playwright/test";
import fs from "node:fs";

const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("each proposal device uses a bounded representative canvas width", () => {
  expect(styles).toContain(".frameDesktop{width:1100px");
  expect(styles).toContain(".frameTablet{width:768px");
  expect(styles).toContain(".frameMobile{width:390px");
});
