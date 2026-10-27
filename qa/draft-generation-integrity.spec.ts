import { expect, test } from "@playwright/test";
import {
  preserveServerOwnedGeneration,
  stripClientCreatedGeneration,
} from "../apps/builder/app/api/drafts/draft-integrity";
import { createBuilderReviewFixture } from "./support/builder-review-fixture";

test.describe("draft generation integrity", () => {
  test("preserves server-owned generation evidence and invalidates stale gates after edits", () => {
    const fixture = createBuilderReviewFixture();
    const current = fixture.select(fixture.candidateIds[0]!).draft.snapshot;
    current.generation!.industryFacts = {
      kind: "restaurant-facts-v1",
      businessName: "Radhika Restaurant",
      address: "12 Jubilee Hills Road",
    };

    const proposed = structuredClone(current);
    proposed.generation!.catalogVersion = "attacker-catalog";
    proposed.generation!.packStatus = "legacy";
    proposed.generation!.candidateIds = ["attacker-candidate"];
    proposed.generation!.selectedCandidateId = "attacker-candidate";
    proposed.generation!.brandProvenance = { colors: {} };
    proposed.generation!.industryFacts = {
      kind: "restaurant-facts-v1",
      businessName: "Invented Restaurant",
      address: "Invented address",
    };
    proposed.pages[0]!.sections[0]!.props.title = "A real editor change";

    const saved = preserveServerOwnedGeneration(current, proposed);
    expect(saved.generation).toMatchObject({
      catalogVersion: current.generation!.catalogVersion,
      packStatus: current.generation!.packStatus,
      candidateIds: current.generation!.candidateIds,
      selectedCandidateId: current.generation!.selectedCandidateId,
      brandProvenance: current.generation!.brandProvenance,
      industryFacts: current.generation!.industryFacts,
    });
    expect(saved.generation?.premiumGate).toBeUndefined();
    expect(saved.pages[0]!.sections[0]!.props.title).toBe(
      "A real editor change",
    );
  });

  test("keeps a premium report for a byte-equivalent autosave", () => {
    const fixture = createBuilderReviewFixture();
    const current = fixture.select(fixture.candidateIds[0]!).draft.snapshot;
    const saved = preserveServerOwnedGeneration(
      current,
      structuredClone(current),
    );
    expect(saved.generation?.premiumGate).toEqual(
      current.generation?.premiumGate,
    );
  });

  test("does not let a client mint generation certification on a new draft", () => {
    const fixture = createBuilderReviewFixture();
    const proposed = fixture.draft.snapshot;
    expect(proposed.generation).toBeDefined();
    expect(stripClientCreatedGeneration(proposed).generation).toBeUndefined();
  });
});
