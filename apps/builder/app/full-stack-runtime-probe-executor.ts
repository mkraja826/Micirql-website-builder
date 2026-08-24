import type { BackendImplementationContract, FunctionalArchitecture } from "@micirql/schema";
import {
  certifyFullStackApplication,
  type FullStackAppCertification,
  type FullStackAppEvidence,
} from "./full-stack-app-certification";

export type FullStackRuntimeProbeTarget = {
  environment: "preview" | "staging";
  appBaseUrl: string;
  productionBaseUrl?: string;
};

export type FullStackRuntimeProbeStep = {
  passed: boolean;
  error?: string;
};

export type FullStackRuntimeProbeAdapter = {
  runPrimaryUiWorkflow: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  verifyApiWrite: (target: FullStackRuntimeProbeTarget, backend: BackendImplementationContract) => Promise<FullStackRuntimeProbeStep>;
  verifyDatabasePersistence: (target: FullStackRuntimeProbeTarget, backend: BackendImplementationContract) => Promise<FullStackRuntimeProbeStep>;
  verifyReloadPersistence: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  verifyServerValidation: (target: FullStackRuntimeProbeTarget, backend: BackendImplementationContract) => Promise<FullStackRuntimeProbeStep>;
  verifyAuthGuard?: (target: FullStackRuntimeProbeTarget, backend: BackendImplementationContract) => Promise<FullStackRuntimeProbeStep>;
  verifyCrossUserIsolation?: (target: FullStackRuntimeProbeTarget, backend: BackendImplementationContract) => Promise<FullStackRuntimeProbeStep>;
  verifyAdminVisibility?: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  verifyAdminMutation?: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  verifyBookingRoundTrip?: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  verifyUploadRoundTrip?: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  verifyPaymentRoundTrip?: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  verifySearchRoundTrip?: (target: FullStackRuntimeProbeTarget, architecture: FunctionalArchitecture) => Promise<FullStackRuntimeProbeStep>;
  cleanup?: (target: FullStackRuntimeProbeTarget) => Promise<void>;
};

export type FullStackRuntimeExecutionResult = {
  evidence: FullStackAppEvidence;
  certification: FullStackAppCertification;
};

export async function executeFullStackRuntimeCertification(input: {
  architecture: FunctionalArchitecture;
  backend: BackendImplementationContract;
  target: FullStackRuntimeProbeTarget;
  adapter: FullStackRuntimeProbeAdapter;
}): Promise<FullStackRuntimeExecutionResult> {
  const { architecture, backend, target, adapter } = input;
  assertSafeTarget(target);
  const observedErrors: string[] = [];

  const base = await runRequiredSteps([
    ["Primary UI workflow", () => adapter.runPrimaryUiWorkflow(target, architecture)],
    ["API write", () => adapter.verifyApiWrite(target, backend)],
    ["Database persistence", () => adapter.verifyDatabasePersistence(target, backend)],
    ["Reload persistence", () => adapter.verifyReloadPersistence(target, architecture)],
    ["Server validation", () => adapter.verifyServerValidation(target, backend)],
  ], observedErrors);

  const evidence: FullStackAppEvidence = {
    environment: target.environment,
    uiWorkflowPassed: base[0] ?? false,
    apiWritePassed: base[1] ?? false,
    databasePersistencePassed: base[2] ?? false,
    reloadPersistencePassed: base[3] ?? false,
    validationFailurePassed: base[4] ?? false,
  };

  try {
    if (architecture.requiresAuth || backend.requiresAuth) {
      evidence.authGuardPassed = await runOptionalRequired("Auth guard", adapter.verifyAuthGuard, target, backend, observedErrors);
      evidence.crossUserIsolationPassed = await runOptionalRequired("Cross-user isolation", adapter.verifyCrossUserIsolation, target, backend, observedErrors);
    }

    if (architecture.capabilities.some((capability) => capability.id === "admin")) {
      evidence.adminVisibilityPassed = await runOptionalRequired("Admin visibility", adapter.verifyAdminVisibility, target, architecture, observedErrors);
      evidence.adminMutationPassed = await runOptionalRequired("Admin mutation", adapter.verifyAdminMutation, target, architecture, observedErrors);
    }

    if (architecture.capabilities.some((capability) => capability.id === "booking")) {
      evidence.bookingRoundTripPassed = await runOptionalRequired("Booking round trip", adapter.verifyBookingRoundTrip, target, architecture, observedErrors);
    }
    if (architecture.requiresFileStorage) {
      evidence.uploadRoundTripPassed = await runOptionalRequired("Upload round trip", adapter.verifyUploadRoundTrip, target, architecture, observedErrors);
    }
    if (architecture.requiresPayments) {
      evidence.paymentRoundTripPassed = await runOptionalRequired("Payment round trip", adapter.verifyPaymentRoundTrip, target, architecture, observedErrors);
    }
    if (architecture.capabilities.some((capability) => capability.id === "search")) {
      evidence.searchRoundTripPassed = await runOptionalRequired("Search round trip", adapter.verifySearchRoundTrip, target, architecture, observedErrors);
    }
  } finally {
    try {
      await adapter.cleanup?.(target);
    } catch (error) {
      observedErrors.push(`Runtime probe cleanup failed: ${errorMessage(error)}`);
    }
  }

  if (observedErrors.length) evidence.observedErrors = observedErrors;
  const certification = certifyFullStackApplication({ architecture, backend, evidence });
  return { evidence, certification };
}

async function runRequiredSteps(steps: Array<[string, () => Promise<FullStackRuntimeProbeStep>]>, errors: string[]) {
  const results: boolean[] = [];
  for (const [label, fn] of steps) results.push(await runStep(label, fn, errors));
  return results;
}

async function runOptionalRequired<T>(label: string, fn: ((target: FullStackRuntimeProbeTarget, input: T) => Promise<FullStackRuntimeProbeStep>) | undefined, target: FullStackRuntimeProbeTarget, input: T, errors: string[]) {
  if (!fn) {
    errors.push(`${label} probe is required but no runtime adapter implementation is configured.`);
    return false;
  }
  return runStep(label, () => fn(target, input), errors);
}

async function runStep(label: string, fn: () => Promise<FullStackRuntimeProbeStep>, errors: string[]) {
  try {
    const result = await fn();
    if (!result.passed && result.error) errors.push(`${label}: ${result.error}`);
    return result.passed;
  } catch (error) {
    errors.push(`${label} probe failed: ${errorMessage(error)}`);
    return false;
  }
}

function assertSafeTarget(target: FullStackRuntimeProbeTarget) {
  const url = target.appBaseUrl.trim();
  if (!url) throw new Error("FULL_STACK_PREVIEW_URL_REQUIRED");
  if (!/^https?:\/\//i.test(url)) throw new Error("FULL_STACK_PREVIEW_URL_INVALID");
  if (target.productionBaseUrl && normalizeUrl(target.productionBaseUrl) === normalizeUrl(url)) throw new Error("FULL_STACK_PREVIEW_MUST_DIFFER_FROM_PRODUCTION");
}
function normalizeUrl(value: string) { return value.trim().replace(/\/+$/, "").toLowerCase(); }
function errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
