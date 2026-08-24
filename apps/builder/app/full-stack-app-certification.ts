import type { BackendImplementationContract, FunctionalArchitecture } from "@micirql/schema";

export type FullStackAppEvidence = {
  environment: "preview" | "staging" | "production";
  uiWorkflowPassed: boolean;
  apiWritePassed: boolean;
  databasePersistencePassed: boolean;
  reloadPersistencePassed: boolean;
  validationFailurePassed: boolean;
  authGuardPassed?: boolean;
  crossUserIsolationPassed?: boolean;
  adminVisibilityPassed?: boolean;
  adminMutationPassed?: boolean;
  bookingRoundTripPassed?: boolean;
  uploadRoundTripPassed?: boolean;
  paymentRoundTripPassed?: boolean;
  searchRoundTripPassed?: boolean;
  observedErrors?: string[];
};

export type FullStackAppIssue = {
  code:
    | "PRODUCTION_CERTIFICATION_FORBIDDEN"
    | "UI_WORKFLOW_FAILED"
    | "API_WRITE_FAILED"
    | "DATABASE_PERSISTENCE_FAILED"
    | "RELOAD_PERSISTENCE_FAILED"
    | "SERVER_VALIDATION_FAILED"
    | "AUTH_GUARD_FAILED"
    | "CROSS_USER_ISOLATION_FAILED"
    | "ADMIN_VISIBILITY_FAILED"
    | "ADMIN_MUTATION_FAILED"
    | "BOOKING_ROUND_TRIP_FAILED"
    | "UPLOAD_ROUND_TRIP_FAILED"
    | "PAYMENT_ROUND_TRIP_FAILED"
    | "SEARCH_ROUND_TRIP_FAILED"
    | "RUNTIME_ERROR";
  message: string;
};

export type FullStackAppCertification = {
  certified: boolean;
  productionPublishAllowed: boolean;
  issues: FullStackAppIssue[];
};

export function certifyFullStackApplication(input: {
  architecture: FunctionalArchitecture;
  backend: BackendImplementationContract;
  evidence: FullStackAppEvidence;
}): FullStackAppCertification {
  const { architecture, backend, evidence } = input;
  const issues: FullStackAppIssue[] = [];

  if (evidence.environment === "production") {
    issues.push({ code: "PRODUCTION_CERTIFICATION_FORBIDDEN", message: "Full-stack certification must run in preview or staging before production publish." });
  }
  if (!evidence.uiWorkflowPassed) issues.push({ code: "UI_WORKFLOW_FAILED", message: "The generated UI could not complete its primary user workflow." });
  if (!evidence.apiWritePassed) issues.push({ code: "API_WRITE_FAILED", message: "A generated state-changing API action did not complete successfully." });
  if (!evidence.databasePersistencePassed) issues.push({ code: "DATABASE_PERSISTENCE_FAILED", message: "The generated workflow was not proven to persist its record in the backend." });
  if (!evidence.reloadPersistencePassed) issues.push({ code: "RELOAD_PERSISTENCE_FAILED", message: "Persisted data did not survive a fresh read/reload." });
  if (!evidence.validationFailurePassed) issues.push({ code: "SERVER_VALIDATION_FAILED", message: "Invalid input was not proven to be rejected at the server boundary." });

  if (architecture.requiresAuth || backend.requiresAuth) {
    if (evidence.authGuardPassed !== true) issues.push({ code: "AUTH_GUARD_FAILED", message: "Protected routes/actions were not proven to require authentication." });
    if (evidence.crossUserIsolationPassed !== true) issues.push({ code: "CROSS_USER_ISOLATION_FAILED", message: "Cross-user or cross-tenant isolation was not proven end-to-end." });
  }

  if (architecture.capabilities.some((capability) => capability.id === "admin")) {
    if (evidence.adminVisibilityPassed !== true) issues.push({ code: "ADMIN_VISIBILITY_FAILED", message: "Admin UI was not proven to see the persisted application record." });
    if (evidence.adminMutationPassed !== true) issues.push({ code: "ADMIN_MUTATION_FAILED", message: "Admin changes were not proven to persist and propagate back to the user-facing app." });
  }

  if (architecture.capabilities.some((capability) => capability.id === "booking") && evidence.bookingRoundTripPassed !== true) {
    issues.push({ code: "BOOKING_ROUND_TRIP_FAILED", message: "Booking UI → API → database → management → read-back was not proven." });
  }
  if (architecture.requiresFileStorage && evidence.uploadRoundTripPassed !== true) {
    issues.push({ code: "UPLOAD_ROUND_TRIP_FAILED", message: "Upload UI → storage → authorized read/delete was not proven in the generated app." });
  }
  if (architecture.requiresPayments && evidence.paymentRoundTripPassed !== true) {
    issues.push({ code: "PAYMENT_ROUND_TRIP_FAILED", message: "Payment UI → server creation → verified settlement → persisted state was not proven." });
  }
  if (architecture.capabilities.some((capability) => capability.id === "search") && evidence.searchRoundTripPassed !== true) {
    issues.push({ code: "SEARCH_ROUND_TRIP_FAILED", message: "Search/filter UI was not proven to query the generated backend correctly." });
  }

  for (const error of evidence.observedErrors ?? []) {
    if (error.trim()) issues.push({ code: "RUNTIME_ERROR", message: error.trim() });
  }

  const certified = issues.length === 0;
  return {
    certified,
    productionPublishAllowed: certified && evidence.environment !== "production",
    issues,
  };
}
