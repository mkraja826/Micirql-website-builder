import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/builder/app/pages-manager.tsx", "utf8");

describe("PagesManager duplicate placement", () => {
  it("creates the duplicate once and places it directly after its source", () => {
    expect(source).toContain("function duplicatePageNextToSource(page: SitePage, sourceIndex: number)");
    expect(source).toContain("const duplicate = duplicatePage(page, site.pages);");
    expect(source).toContain("onDuplicate(duplicate);");
    expect(source).toContain("onReorder(duplicate.id, sourceIndex + 1);");
    expect(source).toContain("onClick={() => duplicatePageNextToSource(page, index)}");
  });
});
