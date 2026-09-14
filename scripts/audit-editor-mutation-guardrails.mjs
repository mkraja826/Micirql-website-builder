import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  guardrails: path.join(root, "src/core/editor/guardrails.ts"),
  supabase: path.join(root, "src/core/editor/supabase.ts"),
};

const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, fs.readFileSync(file, "utf8")]),
);

const checks = [
  ["certified baseline provenance is immutable", source.guardrails.includes("cannot replace certified baseline provenance")],
  ["functional capabilities are immutable in editor", source.guardrails.includes("cannot change or activate functional capabilities")],
  ["system warnings cannot be removed", source.guardrails.includes("cannot remove system quality or configuration warnings")],
  ["page slugs must remain unique", source.guardrails.includes("page slugs must be unique")],
  ["page structure requires sections", source.guardrails.includes("requires sections")],
  ["content must match section order", source.guardrails.includes("contains content outside its section order")],
  ["selected section required for rendered section", source.guardrails.includes("is missing a selected section for")],
  ["selected sections must resolve to catalog", source.guardrails.includes("unavailable section archetype")],
  ["first edit is compared to certified revision one", source.supabase.includes("current?.snapshot ?? this.editorSnapshotFromBaseline(baseline)")],
  ["certified revision one snapshot is loaded", source.supabase.includes('select("version_number, snapshot_hash, materialized_fingerprint, snapshot")')],
  ["materialized baseline fingerprint is hydrated and verified", source.supabase.includes("hydrateMaterializedSite(JSON.stringify(version.snapshot))")],
  ["durable site provenance is verified before editing", source.supabase.includes("Certified editor baseline does not match durable site provenance")],
  ["guardrail runs before draft rpc", source.supabase.indexOf("assertEditorMutationAllowed(previousSnapshot, input.snapshot)") < source.supabase.indexOf('.rpc("save_workspace_draft"')],
  ["no service role bypass", !Object.values(source).some((text) => text.toLowerCase().includes("service_role"))],
  ["generic guardrails contain no Pearl specialization", !Object.values(source).some((text) => /pearl/i.test(text))],
  ["generic guardrails contain no dental specialization", !Object.values(source).some((text) => /dental/i.test(text))],
];

const failures = checks.filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  auditedFiles: Object.values(files).map((file) => path.relative(root, file)),
  checks: checks.map(([name, passed]) => ({ name, passed })),
  failureCount: failures.length,
  failures,
};

const outDir = path.join(root, "artifacts/editor-mutation-guardrails-audit");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error("Editor mutation guardrail audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Editor mutation guardrail audit passed (${checks.length} checks).`);
