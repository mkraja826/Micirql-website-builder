import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/builder/app/pages-manager.tsx", "utf8");

describe("PagesManager move extremes", () => {
  it("moves pages directly to the first and last indexes", () => {
    expect(source).toContain("onReorder(page.id, 0)");
    expect(source).toContain("onReorder(page.id, site.pages.length - 1)");
  });

  it("disables extreme moves at the list boundaries", () => {
    expect(source.match(/disabled=\{index === 0\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source.match(/disabled=\{index === site\.pages\.length - 1\}/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
