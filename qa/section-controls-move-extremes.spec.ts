import fs from "node:fs";
import path from "node:path";

describe("Page structure section move extremes", () => {
  it("moves selected sections directly to the top or bottom through the existing reorder callback", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/section-controls.tsx"), "utf8");
    expect(file).toContain('onClick={() => onMove(selected.id, 0)}>⇈ Top</button>');
    expect(file).toContain('onClick={() => onMove(selected.id, page.sections.length - 1)}>⇊ Bottom</button>');
    expect(file).toContain('disabled={selectedIndex <= 0}');
    expect(file).toContain('disabled={selectedIndex >= page.sections.length - 1}');
  });
});
