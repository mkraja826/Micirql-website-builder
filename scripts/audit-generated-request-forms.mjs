import fs from "node:fs";

const runtime = fs.readFileSync("src/sections/contact/request-form-runtime.tsx", "utf8");
const editorial = fs.readFileSync("src/sections/contact/editorial-inquiry/index.tsx", "utf8");
const local = fs.readFileSync("src/sections/contact/local-conversion/index.tsx", "utf8");

const checks = [
  [runtime.includes('submitRegisteredSiteAction'), "runtime must call the registered site action submitter"],
  [runtime.includes('consent: true'), "runtime must send explicit consent"],
  [runtime.includes('type="checkbox"'), "runtime must collect consent"],
  [runtime.includes('disabled={!active'), "runtime must fail closed without an active binding/config"],
  [runtime.includes('request only'), "runtime must declare request-only semantics"],
  [runtime.includes('does not confirm a booking, reservation, appointment, admission, or outcome'), "runtime must not claim transactional confirmation"],
  [runtime.includes('Request sent.'), "success state must say request sent"],
  [editorial.includes('RequestFormRuntime'), "editorial inquiry must use the request runtime"],
  [local.includes('RequestFormRuntime'), "local conversion must use the request runtime"],
  [!runtime.toLowerCase().includes('booking confirmed'), "runtime must not claim booking confirmation"],
  [!runtime.toLowerCase().includes('appointment confirmed'), "runtime must not claim appointment confirmation"],
  [!runtime.toLowerCase().includes('reservation confirmed'), "runtime must not claim reservation confirmation"],
  [!runtime.toLowerCase().includes('pearl dental'), "generic runtime must not specialize for Pearl Dental"],
];

const failures = checks.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) {
  console.error("Generated request form audit failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Generated request form audit passed.");
