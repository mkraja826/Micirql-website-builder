import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const servicePath = path.join(root, "apps/builder/app/api/generate-content/service.ts");
const migrationPath = path.join(root, "supabase/migrations/20260817102000_allow_generate_content_ai_usage_task.sql");

const service = fs.readFileSync(servicePath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(service, /rest\/v1\/rpc\/record_ai_usage/, "guarded content generation must meter through record_ai_usage");
assert.match(service, /p_task:\s*["']generate-content["']/, "guarded content generation must record the generate-content task");
assert.match(service, /p_input_tokens:\s*input\.usage\.inputTokens/, "input token counts must be sent to metering");
assert.match(service, /p_output_tokens:\s*input\.usage\.outputTokens/, "output token counts must be sent to metering");
assert.match(service, /if \(!response\.ok\)/, "metering failures must fail the guarded generation request");
assert.match(service, /recordedUsage\s*=\s*await recordContentUsage/, "provider usage callback must await persistent metering");

assert.match(migration, /drop constraint if exists ai_usage_events_task_check/i, "migration must replace the AI task constraint");
assert.match(migration, /generate-content/, "AI usage task constraint must allow generate-content");

console.log("AI metering contract verified.");
