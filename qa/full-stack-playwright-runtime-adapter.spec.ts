import { expect, test } from "@playwright/test";
import { createFullStackPlaywrightRuntimeAdapter } from "./full-stack-playwright-runtime-adapter";

test("exposes the complete generated-app runtime probe surface", () => {
  const adapter = createFullStackPlaywrightRuntimeAdapter({
    browser: {} as never,
    request: {} as never,
  });

  expect(Object.keys(adapter).sort()).toEqual([
    "cleanup",
    "runPrimaryUiWorkflow",
    "verifyAdminMutation",
    "verifyAdminVisibility",
    "verifyApiWrite",
    "verifyAuthGuard",
    "verifyBookingRoundTrip",
    "verifyCrossUserIsolation",
    "verifyDatabasePersistence",
    "verifyPaymentRoundTrip",
    "verifyReloadPersistence",
    "verifySearchRoundTrip",
    "verifyServerValidation",
    "verifyUploadRoundTrip",
  ].sort());
});
