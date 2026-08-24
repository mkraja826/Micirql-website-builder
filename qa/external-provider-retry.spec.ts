import { expect, test } from "@playwright/test";
import { createOpenAiCompatibleJsonPlannerModel, type TextProviderUsage } from "@micirql/ai";
import { fetchPexelsImage } from "../apps/builder/app/pexels-stock-image";

test.describe.configure({ mode: "serial" });

const originalFetch = globalThis.fetch;
const originalPexelsKey = process.env.PEXELS_API_KEY;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalPexelsKey === undefined) delete process.env.PEXELS_API_KEY;
  else process.env.PEXELS_API_KEY = originalPexelsKey;
});

function textModel(onUsage?: (usage: TextProviderUsage) => void | Promise<void>) {
  return createOpenAiCompatibleJsonPlannerModel({
    id: "retry-test",
    endpoint: "https://example.test/v1/chat/completions",
    apiKey: "test-key",
    model: "test-model",
    pricing: { inputUsdPerMillionTokens: 0, outputUsdPerMillionTokens: 0 },
    temperature: 0,
    maxOutputTokens: 100,
    onUsage,
  });
}

function completion(content: string, inputTokens = 1, outputTokens = 1) {
  return new Response(JSON.stringify({
    choices: [{ message: { content } }],
    usage: { prompt_tokens: inputTokens, completion_tokens: outputTokens },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

function okCompletion(value: unknown) {
  return completion(JSON.stringify(value));
}

test("text provider retries 429 and then succeeds", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ error: { message: "rate limited" } }), { status: 429, headers: { "retry-after": "0", "content-type": "application/json" } });
    return okCompletion({ ok: true });
  };

  const result = await textModel().generate({ system: "Return JSON", input: { hello: "world" }, responseFormat: "json" });
  expect(result).toEqual({ ok: true });
  expect(calls).toBe(2);
});

test("text provider extracts one balanced JSON value from harmless prose without retrying", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return completion('Here is the requested result: {"ok":true,"note":"braces { and } stay inside strings"} Done.');
  };

  const result = await textModel().generate({ system: "Return JSON", input: {}, responseFormat: "json" });
  expect(result).toEqual({ ok: true, note: "braces { and } stay inside strings" });
  expect(calls).toBe(1);
});

test("text provider retries one malformed JSON completion with a stricter structured-output instruction", async () => {
  let calls = 0;
  const systems: string[] = [];
  const usage: TextProviderUsage[] = [];

  globalThis.fetch = async (_input, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
    systems.push(body.messages.find((message) => message.role === "system")?.content ?? "");
    if (calls === 1) return completion('{"ok":true,"items":[1,2', 3, 4);
    return completion('{"ok":true,"items":[1,2]}', 5, 6);
  };

  const result = await textModel((event) => { usage.push(event); }).generate({
    system: "Return the repaired dental content as JSON.",
    input: { site: "Dental care pearl" },
    responseFormat: "json",
  });

  expect(result).toEqual({ ok: true, items: [1, 2] });
  expect(calls).toBe(2);
  expect(systems[0]).toBe("Return the repaired dental content as JSON.");
  expect(systems[1]).toContain("previous response could not be parsed as JSON");
  expect(systems[1]).toContain("exactly one complete valid JSON object or array");
  expect(usage).toHaveLength(2);
  expect(usage.map((event) => [event.inputTokens, event.outputTokens])).toEqual([[3, 4], [5, 6]]);
});

test("text provider fails closed after exactly two invalid JSON completions", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return completion(calls === 1 ? '{"broken":' : "not json at all");
  };

  await expect(textModel().generate({ system: "Return JSON", input: {}, responseFormat: "json" }))
    .rejects.toThrow("Text provider returned content that is not valid JSON.");
  expect(calls).toBe(2);
});

test("text provider does not accept ambiguous multiple JSON values from prose", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) return completion('First {"candidate":1} second {"candidate":2}');
    return completion('{"candidate":3}');
  };

  const result = await textModel().generate({ system: "Return JSON", input: {}, responseFormat: "json" });
  expect(result).toEqual({ candidate: 3 });
  expect(calls).toBe(2);
});

test("Pexels retries 503 and then succeeds", async () => {
  process.env.PEXELS_API_KEY = "pexels-test-key";
  let calls = 0;
  const imageBytes = new Uint8Array([1, 2, 3, 4]);

  globalThis.fetch = async (input) => {
    calls += 1;
    const url = String(input);
    if (url.includes("api.pexels.com") && calls === 1) return new Response("temporary", { status: 503, headers: { "retry-after": "0" } });
    if (url.includes("api.pexels.com")) {
      return new Response(JSON.stringify({ photos: [{
        id: 77,
        width: 1800,
        height: 1200,
        url: "https://www.pexels.com/photo/77/",
        photographer: "Retry Test",
        photographer_url: "https://www.pexels.com/@retry-test",
        alt: "modern dental clinic",
        src: { original: "https://images.pexels.com/photos/77/original.jpg", landscape: "https://images.pexels.com/photos/77/landscape.jpg" },
      }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(imageBytes, { status: 200, headers: { "content-type": "image/jpeg" } });
  };

  const image = await fetchPexelsImage({ query: "modern dental clinic", domain: "dental clinic", family: "hero" });
  expect(image.photoId).toBe(77);
  expect(image.bytes.byteLength).toBe(4);
  expect(calls).toBe(3);
});

test("text provider does not retry 401", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ error: { message: "unauthorized" } }), { status: 401, headers: { "content-type": "application/json" } });
  };

  await expect(textModel().generate({ system: "Return JSON", input: {}, responseFormat: "json" })).rejects.toThrow("unauthorized");
  expect(calls).toBe(1);
});

test("text provider stops after exactly three retryable network failures", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new TypeError("fetch failed: simulated network outage");
  };

  await expect(textModel().generate({ system: "Return JSON", input: {}, responseFormat: "json" })).rejects.toThrow(/fetch failed/i);
  expect(calls).toBe(3);
});
