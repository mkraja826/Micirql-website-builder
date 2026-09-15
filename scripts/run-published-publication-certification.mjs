import fs from "node:fs";
import { spawn } from "node:child_process";

const bindingsPath = process.env.PUBLISHED_CERTIFICATION_BINDINGS;
const baseUrl = process.env.PUBLISHED_CERTIFICATION_BASE_URL;
const publishEndpoint = process.env.PUBLISHED_CERTIFICATION_PUBLISH_ENDPOINT;
const accessToken = process.env.PUBLISHED_CERTIFICATION_ACCESS_TOKEN;

for (const [name, value] of Object.entries({
  PUBLISHED_CERTIFICATION_BINDINGS: bindingsPath,
  PUBLISHED_CERTIFICATION_BASE_URL: baseUrl,
  PUBLISHED_CERTIFICATION_PUBLISH_ENDPOINT: publishEndpoint,
  PUBLISHED_CERTIFICATION_ACCESS_TOKEN: accessToken,
})) {
  if (!value) throw new Error(`Missing required certification environment variable: ${name}`);
}

const bindings = JSON.parse(fs.readFileSync(bindingsPath, "utf8"));
if (!Array.isArray(bindings) || bindings.length !== 5) throw new Error("Publication certification requires exactly five industry bindings.");

async function publish(binding, versionId) {
  const response = await fetch(publishEndpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ siteId: binding.siteId, versionId }),
  });

  if (!response.ok) throw new Error(`Publication transition failed for ${binding.industry}: HTTP ${response.status}.`);
  const result = await response.json();
  if (result.siteId !== binding.siteId || result.publishedVersionId !== versionId) {
    throw new Error(`Publication transition returned the wrong identity for ${binding.industry}.`);
  }
  return result;
}

function runMatrix(phase) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.PUBLISHED_CERTIFICATION_EXPECTED_VERSION;
    env.PUBLISHED_CERTIFICATION_PHASE = phase;
    env.PUBLISHED_CERTIFICATION_REPORT = `published-certification-${phase}.json`;

    const child = spawn(process.execPath, ["scripts/run-published-browser-matrix.mjs"], {
      stdio: "inherit",
      env,
    });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Browser matrix failed during ${phase}.`)));
  });
}

async function transitionPortfolio(versionKey) {
  const transitions = [];
  for (const binding of bindings) transitions.push(await publish(binding, binding[versionKey]));
  return transitions;
}

await transitionPortfolio("versionOneId");
await runMatrix("v1");

const v2Transitions = await transitionPortfolio("versionTwoId");
for (let index = 0; index < bindings.length; index += 1) {
  if (v2Transitions[index].previousPublishedVersionId !== bindings[index].versionOneId) {
    throw new Error(`V2 transition did not observe V1 as previous publication for ${bindings[index].industry}.`);
  }
}
await runMatrix("v2");

const rollbackTransitions = await transitionPortfolio("versionOneId");
for (let index = 0; index < bindings.length; index += 1) {
  if (rollbackTransitions[index].previousPublishedVersionId !== bindings[index].versionTwoId) {
    throw new Error(`Rollback did not observe V2 as previous publication for ${bindings[index].industry}.`);
  }
}
await runMatrix("rollback-v1");

fs.writeFileSync("published-functional-certification-summary.json", `${JSON.stringify({
  passed: true,
  baseUrl,
  industries: bindings.map((binding) => binding.industry),
  phases: ["v1", "v2", "rollback-v1"],
  completedAt: new Date().toISOString(),
}, null, 2)}\n`);

console.log("Published functional certification passed: V1 → V2 → rollback V1 across the five-industry portfolio.");
