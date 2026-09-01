import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/pages-manager.tsx"), "utf8");

describe("PagesManager delete confirmation", () => {
  it("keeps protected-page guards and confirms removable pages", () => {
    expect(source).toContain('if (site.pages.length <= 1 || page.path === "/") return;');
    expect(source).toContain('window.confirm(`Remove ${page.name}? You can undo this change.`)');
    expect(source).toContain("onRemove(page.id)");
    expect(source).toContain('disabled={site.pages.length <= 1 || page.path === "/"}');
    expect(source).toContain("onClick={() => removePage(page)}");
  });
});
