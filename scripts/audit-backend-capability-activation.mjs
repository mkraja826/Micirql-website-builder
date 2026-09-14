import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const activationPath = path.join(root, "src/core/capabilities/activation.ts");
const editorGuardrailsPath = path.join(root, "src/core/editor/guardrails.ts");
const activation = fs.readFileSync(activationPath, "utf8");
const editorGuardrails = fs.readFileSync(editorGuardrailsPath, "utf8");

const checks = [
  ["backend activation allowlist exists", /const BACKEND_CAPABILITIES = new Set/],
  ["activation requires a ready publishable draft", /draft\.readiness !== "ready"/],
  ["system verification is required", /checkedBy !== "system"/],
  ["verification evidence id is required", /evidenceId\.trim\(\)/],
  ["backend binding reference is required", /binding\.reference\.trim\(\)/],
  ["site function bindings require version", /binding\.version\?\.trim\(\)/],
  ["external workflow bindings require HTTPS", /external binding must use HTTPS/],
  ["duplicate bindings fail closed", /Duplicate verified binding/],
  ["unknown draft capabilities fail closed", /which is not present in the certified draft/],
  ["activation only moves disabled capability to active", /before !== "active" && next\.state === "active"/],
  ["site function activation does not invent a URL", /binding\.kind === "external_url" \? binding\.reference : undefined/],
  ["visual editor still cannot mutate capabilities", /Editor mutations cannot change or activate functional capabilities\./],
  ["no service role bypass in activation core", /service[_-]?role/i, true],
  ["no Pearl specialization in activation core", /pearl/i, true],
  ["no dental specialization in activation core", /dental/i, true],
];

const failures = [];
for (const [name, pattern, invert = false] of checks) {
  const source = name === "visual editor still cannot mutate capabilities" ? editorGuardrails : activation;
  const matched = pattern.test(source);
  const passed = invert ? !matched : matched;
  if (!passed) failures.push(name);
}

const report = {
  audit: "backend-capability-activation",
  version: 1,
  passed: failures.length === 0,
  checked: checks.length,
  failures,
};

const artifactDir = path.join(root, "artifacts/backend-capability-activation-audit");
fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(path.join(artifactDir, "report.json"), JSON.stringify(report, null, 2));

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
