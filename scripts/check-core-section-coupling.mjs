import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const coreDir = path.join(root, "src", "core");
const sectionCatalogFiles = [
  path.join(root, "src", "sections", "catalog.ts"),
  path.join(root, "src", "sections", "expansion.ts"),
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(ts|tsx|js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const ids = new Set();
for (const file of sectionCatalogFiles) {
  if (!fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  for (const match of text.matchAll(/\bid\s*:\s*["']([^"']+)["']/g)) ids.add(match[1]);
}

const violations = [];
for (const file of walk(coreDir)) {
  const text = fs.readFileSync(file, "utf8");
  for (const id of ids) {
    if (text.includes(`"${id}"`) || text.includes(`'${id}'`) || text.includes(`\`${id}\``)) {
      violations.push(`${path.relative(root, file)} -> ${id}`);
    }
  }
}

if (violations.length) {
  console.error("Core generation must reference section types/intents, not concrete section IDs.");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(`Core/section coupling check passed (${ids.size} section IDs scanned).`);
