import fs from "node:fs";
import path from "node:path";

describe("Page structure add placement", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/section-controls.tsx"), "utf8");

  it("moves a newly added section directly after the selected non-global section", () => {
    expect(source).toContain("const section = newSection(family, variant, componentId);");
    expect(source).toContain("onAdd(section);");
    expect(source).toContain("if (selectedIndex >= 0 && !selectedIsGlobal) onMove(section.id, selectedIndex + 1);");
  });
});
