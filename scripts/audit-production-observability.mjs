import fs from "node:fs";

const paths = {
  events: "src/core/observability/operational-events.ts",
  publish: "app/api/sites/[siteId]/publish/route.ts",
  publishedPage: "app/published/[siteId]/[[...slug]]/page.tsx",
  wrangler: "wrangler.jsonc",
};
for (const file of Object.values(paths)) {
  if (!fs.existsSync(file)) throw new Error(`Missing observability boundary file: ${file}`);
}

const events = fs.readFileSync(paths.events, "utf8");
const publish = fs.readFileSync(paths.publish, "utf8");
const page = fs.readFileSync(paths.publishedPage, "utf8");
const wrangler = fs.readFileSync(paths.wrangler, "utf8");

for (const required of [
  "schema: \"micirql.operational.v1\"",
  "requestId: event.requestId",
  "durationMs",
  "statusCode",
  "safeIdentifier",
  "crypto.randomUUID()",
  "console.info(line)",
  "console.warn(line)",
]) {
  if (!events.includes(required)) throw new Error(`Structured operational events missing: ${required}`);
}
for (const required of [
  "getOperationalRequestId(request.headers)",
  'headers: { "x-request-id": requestId }',
  'operation: "publication.publish"',
  'operation: "publication.reconcile"',
  'outcome: "uncertain"',
  "failureCode: \"publication_outcome_unknown\"",
]) {
  if (!publish.includes(required)) throw new Error(`Publication observability missing: ${required}`);
}
for (const required of [
  "getOperationalRequestId(requestHeaders)",
  'operation: "published_site.render"',
  "rendered.site.publishedVersionId",
  "failureCode: \"published_site_load_failed\"",
]) {
  if (!page.includes(required)) throw new Error(`Published render observability missing: ${required}`);
}

for (const forbidden of ["authorization", "Bearer ", "SUPABASE_SERVICE_ROLE_KEY", "process.env", "email", "hostname"]) {
  if (events.includes(forbidden)) throw new Error(`Operational event schema must not log secrets or unnecessary PII: ${forbidden}`);
}
if (!/observability[\s\S]*enabled[\s\S]*true/.test(wrangler)) {
  throw new Error("Cloudflare Workers observability must remain enabled.");
}

console.log("Production observability boundary passed.");
