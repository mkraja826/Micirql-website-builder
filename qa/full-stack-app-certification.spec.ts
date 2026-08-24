import { expect, test } from "@playwright/test";
import { deriveFunctionalArchitecture } from "../apps/builder/app/functional-architecture";
import { deriveBackendImplementationContract } from "../apps/builder/app/backend-implementation-contract";
import { certifyFullStackApplication } from "../apps/builder/app/full-stack-app-certification";

function clinicArchitecture() {
  return deriveFunctionalArchitecture({
    business_name: "Pearl Dental",
    industry: "dental clinic",
    goals: ["appointment booking", "patient login", "admin dashboard"],
    required_capabilities: ["booking", "auth", "admin", "backend"],
    services: ["implants"],
  });
}

test("certifies a complete booking application round trip", () => {
  const architecture = clinicArchitecture();
  const backend = deriveBackendImplementationContract(architecture);
  const result = certifyFullStackApplication({
    architecture,
    backend,
    evidence: {
      environment: "preview",
      uiWorkflowPassed: true,
      apiWritePassed: true,
      databasePersistencePassed: true,
      reloadPersistencePassed: true,
      validationFailurePassed: true,
      authGuardPassed: true,
      crossUserIsolationPassed: true,
      adminVisibilityPassed: true,
      adminMutationPassed: true,
      bookingRoundTripPassed: true,
    },
  });

  expect(result.certified).toBe(true);
  expect(result.productionPublishAllowed).toBe(true);
  expect(result.issues).toHaveLength(0);
});

test("fails closed when the UI looks functional but data does not persist", () => {
  const architecture = clinicArchitecture();
  const backend = deriveBackendImplementationContract(architecture);
  const result = certifyFullStackApplication({
    architecture,
    backend,
    evidence: {
      environment: "staging",
      uiWorkflowPassed: true,
      apiWritePassed: true,
      databasePersistencePassed: false,
      reloadPersistencePassed: false,
      validationFailurePassed: true,
      authGuardPassed: true,
      crossUserIsolationPassed: true,
      adminVisibilityPassed: false,
      adminMutationPassed: false,
      bookingRoundTripPassed: false,
    },
  });

  expect(result.certified).toBe(false);
  expect(result.productionPublishAllowed).toBe(false);
  expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
    "DATABASE_PERSISTENCE_FAILED",
    "RELOAD_PERSISTENCE_FAILED",
    "ADMIN_VISIBILITY_FAILED",
    "BOOKING_ROUND_TRIP_FAILED",
  ]));
});

test("never certifies directly against production", () => {
  const architecture = deriveFunctionalArchitecture({
    business_name: "Simple Leads",
    industry: "professional services",
    goals: ["contact enquiries"],
    required_capabilities: ["backend"],
    notes: "Lead capture form with persistence.",
  });
  const backend = deriveBackendImplementationContract(architecture);
  const result = certifyFullStackApplication({
    architecture,
    backend,
    evidence: {
      environment: "production",
      uiWorkflowPassed: true,
      apiWritePassed: true,
      databasePersistencePassed: true,
      reloadPersistencePassed: true,
      validationFailurePassed: true,
    },
  });

  expect(result.certified).toBe(false);
  expect(result.issues.some((issue) => issue.code === "PRODUCTION_CERTIFICATION_FORBIDDEN")).toBe(true);
});
