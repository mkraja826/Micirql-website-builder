import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";
import { executeFullStackRuntimeCertification } from "../apps/builder/app/full-stack-runtime-probe-executor";

function clinicArchitecture() {
  return deriveFunctionalArchitecture({
    business_name: "Pearl Dental",
    industry: "dental clinic",
    goals: ["appointment booking", "patient login", "admin dashboard"],
    required_capabilities: ["booking", "auth", "admin", "backend"],
    services: ["implants"],
  });
}

const pass = async () => ({ passed: true });

test("collects runtime evidence and certifies a complete booking app", async () => {
  const architecture = clinicArchitecture();
  const backend = deriveBackendImplementationContract(architecture);
  const result = await executeFullStackRuntimeCertification({
    architecture,
    backend,
    target: { environment: "preview", appBaseUrl: "https://preview.example.test", productionBaseUrl: "https://example.com" },
    adapter: {
      runPrimaryUiWorkflow: pass,
      verifyApiWrite: pass,
      verifyDatabasePersistence: pass,
      verifyReloadPersistence: pass,
      verifyServerValidation: pass,
      verifyAuthGuard: pass,
      verifyCrossUserIsolation: pass,
      verifyAdminVisibility: pass,
      verifyAdminMutation: pass,
      verifyBookingRoundTrip: pass,
    },
  });

  expect(result.evidence.bookingRoundTripPassed).toBe(true);
  expect(result.certification.certified).toBe(true);
  expect(result.certification.productionPublishAllowed).toBe(true);
});

test("fails closed when a required runtime probe adapter is missing", async () => {
  const architecture = clinicArchitecture();
  const backend = deriveBackendImplementationContract(architecture);
  const result = await executeFullStackRuntimeCertification({
    architecture,
    backend,
    target: { environment: "staging", appBaseUrl: "https://stage.example.test" },
    adapter: {
      runPrimaryUiWorkflow: pass,
      verifyApiWrite: pass,
      verifyDatabasePersistence: pass,
      verifyReloadPersistence: pass,
      verifyServerValidation: pass,
      verifyAuthGuard: pass,
      verifyCrossUserIsolation: pass,
      verifyAdminVisibility: pass,
      verifyAdminMutation: pass,
    },
  });

  expect(result.evidence.bookingRoundTripPassed).toBe(false);
  expect(result.certification.certified).toBe(false);
  expect(result.evidence.observedErrors?.some((error) => error.includes("Booking round trip probe is required"))).toBe(true);
});

test("refuses to certify against the production app URL", async () => {
  const architecture = clinicArchitecture();
  const backend = deriveBackendImplementationContract(architecture);
  await expect(executeFullStackRuntimeCertification({
    architecture,
    backend,
    target: {
      environment: "preview",
      appBaseUrl: "https://example.com/",
      productionBaseUrl: "https://example.com",
    },
    adapter: {
      runPrimaryUiWorkflow: pass,
      verifyApiWrite: pass,
      verifyDatabasePersistence: pass,
      verifyReloadPersistence: pass,
      verifyServerValidation: pass,
    },
  })).rejects.toThrow(/FULL_STACK_PREVIEW_MUST_DIFFER_FROM_PRODUCTION/);
});
