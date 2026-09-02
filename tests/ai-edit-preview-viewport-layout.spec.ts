import { expect, test } from "@playwright/test";
import fs from "node:fs";

const styles = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.module.css", "utf8");

test("tablet and mobile proposal previews are centered inside the card", () => {
  expect(styles).toContain(".tablet{max-width:430px;margin-inline:auto}");
  expect(styles).toContain(".mobile{max-width:250px;margin-inline:auto}");
});
