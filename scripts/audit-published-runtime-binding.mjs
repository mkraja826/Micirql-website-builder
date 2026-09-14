import fs from "node:fs";
import path from "node:path";

const runtime = fs.readFileSync("src/core/publish/runtime.ts", "utf8");
const formRuntime = fs.readFileSync("src/sections/contact/request-form-runtime.tsx", "utf8");

function sourceFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

const generatedFiles = sourceFiles("app/generated");
const generatedSources = generatedFiles.map((file) => [file, fs.readFileSync(file, "utf8")]);

const checks = [
  [runtime.includes('status: "published"'), "published runtime must only represent published sites"],
  [runtime.includes("runtime.renderedVersionId !== runtime.publishedVersionId"), "published runtime must bind only the currently published version"],
  [runtime.includes('capability.state !== "active"'), "published runtime must reject inactive capabilities"],
  [runtime.includes("REQUEST_CAPABILITY_IDS"), "published runtime must restrict action injection to supported request capabilities"],
  [runtime.includes("siteId: runtime.dbSiteId"), "published runtime must supply the durable database site id"],
  [runtime.includes("capabilityKey"), "published runtime must supply the request capability key"],
  [!runtime.includes("actionId:"), "published runtime must not embed an action id"],
  [!runtime.includes("actionVersion:"), "published runtime must not embed an action version"],
  [formRuntime.includes("siteId: string"), "generated form action must require siteId"],
  [formRuntime.includes("capabilityKey: RequestCapabilityId"), "generated form action must require capabilityKey"],
  [generatedSources.every(([, source]) => !source.includes("buildPublishedRequestAction")), "generated benchmark/preview routes must not invoke the published runtime action builder"],
  [generatedSources.every(([, source]) => !/\baction\s*=\s*\{\{/.test(source)), "generated benchmark/preview routes must not embed request action identity"],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);

if (failures.length) {
  console.error("Published runtime binding audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log(`Published runtime binding audit passed. Checked ${generatedFiles.length} generated route source files.`);
