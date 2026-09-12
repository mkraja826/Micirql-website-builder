import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/core");
const ALLOWED_FILES = new Set([
  path.resolve("src/core/brief/interpreter.ts"),
]);

const forbidden = [
  { pattern: /pearl\s*dental|pearl[-_/]/i, reason: "Pearl is a benchmark fixture and must stay outside generic core" },
  { pattern: /planDentalCapabilities|resolvePearl/i, reason: "benchmark-specific planners/resolvers must stay outside generic core" },
  { pattern: /modern dental clinic|dental clinic treatment|clinic phone number|call the clinic|open clinic location/i, reason: "rendering/content assumptions for one vertical do not belong in generic core" },
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(?:ts|tsx|js|mjs)$/.test(entry.name) ? [full] : [];
  });
}

const violations = [];
for (const file of walk(ROOT)) {
  if (ALLOWED_FILES.has(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(source)) {
      violations.push({ file: path.relative(process.cwd(), file), reason: rule.reason });
    }
  }
}

if (violations.length) {
  console.error("Generic core specialization boundary failed:\n");
  for (const violation of violations) console.error(`- ${violation.file}: ${violation.reason}`);
  process.exit(1);
}

console.log("Generic core specialization boundary passed.");
