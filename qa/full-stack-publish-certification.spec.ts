import { expect, test } from "@playwright/test";
import type { BackendImplementationContract, FunctionalArchitecture, Site } from "@micirql/schema";
import {
  configureFullStackPublishCertificationStore,
  evaluateFullStackPublishCertification,
} from "../apps/builder/app/publish-full-stack-certification";

const site = { siteId: "site-pearl", workspaceId: "workspace-1", name: "Pearl Dental" } as Site;

function architecture(backendRequired: boolean): FunctionalArchitecture {
  return {
    version: "1.0",
    productType: backendRequired ? "booking website" : "marketing website",
    surfaces: backendRequired ? ["marketing-site", "booking", "web-app", "api"] : ["marketing-site"],
    roles: [], entities: [], capabilities: backendRequired ? [{ id: "booking", name: "Booking", category: "booking", description: "Book appointment", required: true, roles: [], entityIds: [] }] : [],
    workflows: [], policies: [], integrations: [], acceptanceTests: [],
    backendRequired,
    multiTenant: false,
    requiresAuth: false,
    requiresPayments: false,
    requiresFileStorage: false,
    requiresBackgroundJobs: false,
    notes: [],
  };
}

function backend(hasWrite: boolean): BackendImplementationContract {
  return {
    version: "1.0", provider: "supabase", tables: [], policies: [],
    routes: hasWrite ? [{ id: "booking-create", method: "POST", path: "/api/bookings", entityIds: [], auth: "public", idempotent: true, serverValidation: true }] : [],
    storageBuckets: [], jobs: [], integrations: [], acceptanceChecks: [],
    requiresAuth: false, requiresRls: false, requiresSecrets: false, notes: [],
  };
}

test("static marketing sites do not require full-stack runtime certification", async () => {
  const result = await evaluateFullStackPublishCertification({ site, architecture: architecture(false), backend: backend(false), enforce: true });
  expect(result.allowed).toBe(true);
  expect(result.status).toBe("not-required");
});

test("backend-enabled apps fail closed without an exact certified preview", async () => {
  configureFullStackPublishCertificationStore({ async find() { return undefined; } });
  const result = await evaluateFullStackPublishCertification({ site, architecture: architecture(true), backend: backend(true), enforce: true });
  expect(result.allowed).toBe(false);
  expect(result.status).toBe("missing");
});

test("backend-enabled apps publish only with a passing receipt for the exact draft fingerprint", async () => {
  const appArchitecture = architecture(true);
  const appBackend = backend(true);
  const first = await evaluateFullStackPublishCertification({ site, architecture: appArchitecture, backend: appBackend, enforce: false });
  configureFullStackPublishCertificationStore({
    async find(args) {
      if (args.draftFingerprint !== first.draftFingerprint) return undefined;
      return {
        siteId: args.siteId,
        draftFingerprint: args.draftFingerprint,
        previewUrl: "https://preview-pearl.example.test",
        environment: "preview",
        passed: true,
        certifiedAt: new Date().toISOString(),
        architecture: appArchitecture,
        backend: appBackend,
      };
    },
  });
  const result = await evaluateFullStackPublishCertification({ site, architecture: appArchitecture, backend: appBackend, enforce: true });
  expect(result.allowed).toBe(true);
  expect(result.status).toBe("certified");
  expect(result.receipt?.previewUrl).toContain("preview-pearl");
});
