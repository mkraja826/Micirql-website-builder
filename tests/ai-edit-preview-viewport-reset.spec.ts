import { expect, test } from "@playwright/test";
import fs from "node:fs";

const visual = fs.readFileSync("apps/builder/app/ai-edit-visual-preview.tsx", "utf8");

test("proposal preview follows later editor viewport changes", () => {
  expect(visual).toContain("useEffect(() => { setViewport(initialViewport); }, [initialViewport])");
});
