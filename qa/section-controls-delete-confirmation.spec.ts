import fs from "node:fs";
import path from "node:path";

describe("Page structure section deletion", () => {
  it("confirms removal and preserves the existing remove callback", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/section-controls.tsx"), "utf8");
    expect(file).toContain('window.confirm("Remove this section? You can undo this change.")');
    expect(file).toContain("onRemove(selected.id);");
    expect(file).toContain('onClick={removeSelected}>Delete</button>');
    expect(file).toContain("if (!selected || selectedIsGlobal) return;");
  });
});
