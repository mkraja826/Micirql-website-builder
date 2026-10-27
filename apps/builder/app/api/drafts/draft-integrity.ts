import { siteSchema, type Site } from "@micirql/schema";

/**
 * Generation identity and normalized industry facts are server-owned. The
 * editor may change content/theme fields, but it cannot rewrite the evidence
 * that selection and publishing validate against. Any real editable change
 * invalidates the old premium report; a byte-equivalent autosave keeps it.
 */
export function preserveServerOwnedGeneration(
  current: Site,
  proposed: Site,
): Site {
  const next = structuredClone(proposed);
  if (!current.generation) {
    delete next.generation;
    return siteSchema.parse(next);
  }

  const currentGeneration = current.generation;
  const proposedGeneration = next.generation
    ? structuredClone(next.generation)
    : structuredClone(currentGeneration);
  proposedGeneration.catalogVersion = currentGeneration.catalogVersion;
  proposedGeneration.packStatus = currentGeneration.packStatus;
  proposedGeneration.candidateIds = [...currentGeneration.candidateIds];
  copyOptionalGenerationField(
    proposedGeneration,
    currentGeneration,
    "selectedCandidateId",
  );
  copyOptionalGenerationField(
    proposedGeneration,
    currentGeneration,
    "brandProvenance",
  );
  copyOptionalGenerationField(
    proposedGeneration,
    currentGeneration,
    "industryFacts",
  );
  delete proposedGeneration.premiumGate;
  next.generation = proposedGeneration;

  if (
    currentGeneration.premiumGate &&
    editableSnapshot(current) === editableSnapshot(next)
  ) {
    next.generation.premiumGate = structuredClone(
      currentGeneration.premiumGate,
    );
  }
  return siteSchema.parse(next);
}

export function stripClientCreatedGeneration(site: Site): Site {
  const next = structuredClone(site);
  delete next.generation;
  return siteSchema.parse(next);
}

function copyOptionalGenerationField<
  TKey extends "selectedCandidateId" | "brandProvenance" | "industryFacts",
>(
  target: NonNullable<Site["generation"]>,
  source: NonNullable<Site["generation"]>,
  key: TKey,
) {
  const value = source[key];
  if (value === undefined) delete target[key];
  else {
    target[key] = structuredClone(value) as NonNullable<
      Site["generation"]
    >[TKey];
  }
}

function editableSnapshot(site: Site): string {
  const next = structuredClone(site);
  if (next.generation) delete next.generation.premiumGate;
  return JSON.stringify(next);
}
