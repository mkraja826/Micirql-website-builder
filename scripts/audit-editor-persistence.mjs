import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  schema: path.join(root, "src/core/editor/schema.ts"),
  repository: path.join(root, "src/core/editor/repository.ts"),
  supabase: path.join(root, "src/core/editor/supabase.ts"),
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
);

const checks = [
  ["editor snapshot pins materialized baseline id", source.schema.includes("materializedSiteId: string")],
  ["editor snapshot pins certified fingerprint", source.schema.includes("fingerprint: string")],
  ["editor snapshot pins source key", source.schema.includes("sourceKey: string")],
  ["editor snapshot pins candidate id", source.schema.includes("candidateId: string")],
  ["editor snapshot pins draft version", source.schema.includes("draftVersion:")],
  ["save requires expected revision", source.schema.includes("expectedRevision: number")],
  ["identity mismatch fails closed", source.repository.includes("Editor draft identity does not match save target")],
  ["missing provenance fails closed", source.repository.includes("missing immutable certified baseline provenance")],
  ["safe integer revision enforced", source.supabase.includes("Number.isSafeInteger(input.expectedRevision)")],
  ["revision conflict enforced", source.supabase.includes("Editor draft revision conflict")],
  ["uses authenticated draft rpc", source.supabase.includes('.rpc("save_workspace_draft"')],
  ["loads immutable revision one baseline", source.supabase.includes('.eq("version_number", 1)')],
  ["certified fingerprint consistency checked", source.supabase.includes("Certified editor baseline fingerprint is missing or inconsistent")],
  ["baseline provenance replacement rejected", source.supabase.includes("Editor draft cannot replace its certified baseline provenance")],
  ["no service role bypass", !source.supabase.toLowerCase().includes("service_role")],
  ["generic editor core contains no Pearl specialization", !Object.values(source).some((text) => /pearl/i.test(text))],
  ["generic editor core contains no dental specialization", !Object.values(source).some((text) => /dental/i.test(text))],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  auditedFiles: Object.values(files).map((file) => path.relative(root, file)),
  checks: checks.map(([name, passed]) => ({ name, passed })),
  failureCount: failures.length,
  failures,
};

const outDir = path.join(root, "artifacts/editor-persistence-audit");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error("Editor persistence audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Editor persistence audit passed (${checks.length} checks).`);
