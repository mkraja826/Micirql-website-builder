import { expect, test } from "@playwright/test";
import {
  createFullStackPlaywrightRuntimeAdapter,
  semanticProbeSelectorCandidates,
} from "./full-stack-playwright-runtime-adapter";

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

test("discovers generated controls semantically without visual selectors", () => {
  expect(semanticProbeSelectorCandidates.primarySubmit).toContain("button[type=submit]");
  expect(semanticProbeSelectorCandidates.authEmail).toContain("input[type=email]");
  expect(semanticProbeSelectorCandidates.authPassword).toContain("input[type=password]");
  expect(semanticProbeSelectorCandidates.uploadInput).toEqual(["input[type=file]"]);
  expect(semanticProbeSelectorCandidates.searchInput).toContain("input[type=search]");

  for (const selectors of Object.values(semanticProbeSelectorCandidates)) {
    expect(selectors.some((selector) => selector.includes("class="))).toBe(false);
    expect(selectors.some((selector) => selector.startsWith("."))).toBe(false);
  }
});
