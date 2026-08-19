import { expect, test } from "@playwright/test";
import { classifyGenerationFailure, runGenerationRecovery } from "../apps/builder/app/generation-recovery";

const attempts = [
  { profile: { id: "primary" }, profileId: "primary", provider: "cloudflare-workers-ai", model: "primary-model" },
  { profile: { id: "fallback" }, profileId: "fallback", provider: "openai-compatible", model: "fallback-model" },
] as const;

test("falls back when primary provider returns malformed output", async () => {
  const calls: string[] = [];
  const result = await runGenerationRecovery(attempts, async (attempt) => {
    calls.push(attempt.profileId);
    if (attempt.profileId === "primary") throw new Error("Content model returned an invalid site snapshot: schema validation failed");
    return { site: "valid" };
  });

  expect(calls).toEqual(["primary", "fallback"]);
  expect(result.result).toEqual({ site: "valid" });
  expect(result.fallbackUsed).toBe(true);
  expect(result.failures).toHaveLength(1);
  expect(result.failures[0]?.kind).toBe("malformed-output");
});

test("falls back after primary content remains below quality threshold", async () => {
  const result = await runGenerationRecovery(attempts, async (attempt) => {
    if (attempt.profileId === "primary") throw new Error("CONTENT_QUALITY_REJECTED_AFTER_REWRITE: score 71/82");
    return { accepted: true };
  });

  expect(result.selectedProfileId).toBe("fallback");
  expect(result.failures[0]?.kind).toBe("quality-rejected");
});

test("records timeout and network failures and exhausts providers without returning a partial result", async () => {
  let calls = 0;
  await expect(runGenerationRecovery(attempts, async (attempt) => {
    calls += 1;
    if (attempt.profileId === "primary") throw new Error("request timed out after deadline");
    throw new TypeError("fetch failed: simulated network outage");
  })).rejects.toMatchObject({
    code: "GENERATION_RECOVERY_EXHAUSTED",
    failures: [
      expect.objectContaining({ profileId: "primary", kind: "timeout" }),
      expect.objectContaining({ profileId: "fallback", kind: "network" }),
    ],
  });
  expect(calls).toBe(2);
});

test("failure classifier distinguishes transient, auth, malformed and quality failures", () => {
  expect(classifyGenerationFailure(new Error("429 rate limit exceeded"))).toBe("rate-limit");
  expect(classifyGenerationFailure(new Error("503 service unavailable"))).toBe("provider-unavailable");
  expect(classifyGenerationFailure(new Error("401 unauthorized"))).toBe("authentication");
  expect(classifyGenerationFailure(new Error("invalid JSON parse result"))).toBe("malformed-output");
  expect(classifyGenerationFailure(new Error("CONTENT_QUALITY_REJECTED_AFTER_REWRITE"))).toBe("quality-rejected");
});
