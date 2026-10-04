import type { GenerationMetadata } from "@micirql/schema";

export function resolveOnboardingStatus(
  profileCompleted: boolean,
  generation?: GenerationMetadata,
) {
  const certifiedFlow = generation?.packStatus === "certified";
  const certifiedSelectionPassed = Boolean(
    generation?.selectedCandidateId && generation.premiumGate?.passed === true,
  );
  const reviewPending = certifiedFlow && !certifiedSelectionPassed;

  return {
    reviewPending,
    completed: profileCompleted && !reviewPending,
  };
}
