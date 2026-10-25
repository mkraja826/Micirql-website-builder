import { expect, test } from "@playwright/test";
import {
  ProviderRequestAbortedError,
  ProviderRequestTimeoutError,
  providerTimeoutFailure,
  runWithProviderBoundary,
} from "../supabase/functions/ai-gateway/provider-boundary";

test.describe("AI gateway provider boundary", () => {
  test("aborts a hung provider request at its own deadline", async () => {
    let providerSignal: AbortSignal | undefined;

    const request = runWithProviderBoundary(
      async (signal) => {
        providerSignal = signal;
        return await rejectWhenAborted(signal);
      },
      { timeoutMs: 10 },
    );

    await expect(request).rejects.toMatchObject({
      name: "ProviderRequestTimeoutError",
      code: "provider_timeout",
      category: "transient",
      retryable: true,
      status: 504,
      timeoutMs: 10,
    } satisfies Partial<ProviderRequestTimeoutError>);
    expect(providerSignal?.aborted).toBe(true);
  });

  test("maps a provider deadline to the structured transient 504 contract", () => {
    const failure = providerTimeoutFailure(
      new ProviderRequestTimeoutError(30_000),
      {
        provider: "nvidia",
        model: "nvidia/nemotron-3.5-lightning-30b-a3b",
        warnings: ["nvidia:model: provider_timeout"],
      },
    );

    expect(failure).toEqual({
      status: 504,
      body: {
        error: "provider_timeout",
        code: "provider_timeout",
        category: "transient",
        retryable: true,
        provider: "nvidia",
        model: "nvidia/nemotron-3.5-lightning-30b-a3b",
        timeout_ms: 30_000,
        warnings: ["nvidia:model: provider_timeout"],
      },
    });
  });

  test("propagates caller cancellation to the provider request", async () => {
    const caller = new AbortController();
    let providerSignal: AbortSignal | undefined;

    const request = runWithProviderBoundary(
      async (signal) => {
        providerSignal = signal;
        return await rejectWhenAborted(signal);
      },
      { timeoutMs: 1_000, callerSignal: caller.signal },
    );

    caller.abort();

    await expect(request).rejects.toMatchObject({
      name: "ProviderRequestAbortedError",
      code: "provider_request_aborted",
      category: "request",
      retryable: false,
      status: 499,
    } satisfies Partial<ProviderRequestAbortedError>);
    expect(providerSignal?.aborted).toBe(true);
  });
});

function rejectWhenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });
}
