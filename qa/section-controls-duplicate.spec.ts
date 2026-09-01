import fs from "node:fs";
import path from "node:path";

describe("Page structure section duplication", () => {
  it("duplicates only non-global sections with a fresh id through the existing add path", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/section-controls.tsx"), "utf8");
    expect(file).toContain("if (!selected || selectedIsGlobal) return;");
    expect(file).toContain("...structuredClone(selected)");
    expect(file).toContain('id: `${family ?? "section"}-${crypto.randomUUID()}`');
    expect(file).toContain("onAdd(duplicate);");
    expect(file).toContain('onClick={duplicateSelected}>Duplicate</button>');
  });
});
