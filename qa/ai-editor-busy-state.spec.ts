import fs from "node:fs";
import path from "node:path";

describe("Ask MiCirql busy state", () => {
  it("exposes processing state on the prompt area", () => {
    const file = fs.readFileSync(path.join(process.cwd(), "apps/builder/app/ai-editor-assistant.tsx"), "utf8");
    expect(file).toContain('className={styles.input} aria-busy={busy}');
  });
});
