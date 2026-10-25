import { expect, test } from "@playwright/test";
import {
  PHYSIOTHERAPY_DRAFT_CANDIDATES,
  PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE,
  physiotherapyDraftCandidateCatalog,
  physiotherapyDraftPack,
} from "../apps/builder/app/industry-packs/drafts";
import {
  assessCrossIndustryDesignDistinctness,
  assessWithinIndustryDesignDistinctness,
  candidateDesignSignature,
  candidateWithinIndustryDesignSignature,
  physiotherapyIndustryPack,
  resolveCertifiedIndustryPackById,
  validateWithinIndustryDesignCatalog,
  type IndustryDesignSignature,
  type WithinIndustryDesignSignature,
} from "../apps/builder/app/industry-packs";

test.describe("cross-industry design isolation", () => {
  test("the physiotherapy movement-pathway prototype is not a Dental Top-20 clone", () => {
    const dental = resolveCertifiedIndustryPackById("clinic-dental");
    expect(dental).toBeDefined();

    const assessments = dental!
      .listCandidates()
      .map((candidate) =>
        assessCrossIndustryDesignDistinctness(
          PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE,
          candidateDesignSignature(dental!, candidate),
          physiotherapyDraftPack.designGrammar,
          dental!.designGrammar,
        ),
      );

    expect(assessments.every((assessment) => assessment.pass)).toBe(true);
    expect(
      Math.max(...assessments.map((assessment) => assessment.similarity)),
    ).toBeLessThanOrEqual(
      physiotherapyDraftPack.designGrammar.maximumCrossIndustrySimilarity,
    );
  });

  test("rejects a copied structure even when its pack and grammar names change", () => {
    const dental = resolveCertifiedIndustryPackById("clinic-dental")!;
    const source = candidateDesignSignature(
      dental,
      dental.listCandidates()[0]!,
    );
    const copied = {
      ...source,
      packId: "clinic-copy",
      grammarId: "clinic-copy-renamed-v1",
      candidateId: "clinic-copy-precision",
      motifs: ["renamed-motif"],
    } satisfies IndustryDesignSignature;
    const assessment = assessCrossIndustryDesignDistinctness(
      copied,
      source,
      {
        ...dental.designGrammar,
        id: copied.grammarId,
        motifs: copied.motifs,
      },
      dental.designGrammar,
    );

    expect(assessment.pass).toBe(false);
    expect(assessment.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INDUSTRY_DESIGN_STRUCTURE_COPIED",
        }),
      ]),
    );
  });

  test("rejects reuse of another industry's named visual grammar", () => {
    const dental = resolveCertifiedIndustryPackById("clinic-dental")!;
    const source = candidateDesignSignature(
      dental,
      dental.listCandidates()[0]!,
    );
    const reused = {
      ...PHYSIOTHERAPY_DRAFT_DESIGN_SIGNATURE,
      packId: "clinic-reused-grammar",
      grammarId: dental.designGrammar.id,
    } satisfies IndustryDesignSignature;
    const assessment = assessCrossIndustryDesignDistinctness(
      reused,
      source,
      { ...physiotherapyDraftPack.designGrammar, id: dental.designGrammar.id },
      dental.designGrammar,
    );

    expect(assessment.pass).toBe(false);
    expect(assessment.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INDUSTRY_DESIGN_GRAMMAR_REUSED",
        }),
      ]),
    );
  });
});

test.describe("within-industry candidate isolation", () => {
  test("the audited staging snapshot and promoted Physiotherapy Top 20 retain the same distinct design identities", () => {
    const dental = resolveCertifiedIndustryPackById("clinic-dental")!;
    const candidates = physiotherapyDraftCandidateCatalog.listCandidates();
    const within = validateWithinIndustryDesignCatalog(
      physiotherapyDraftCandidateCatalog,
    );

    expect(candidates).toHaveLength(20);
    expect(PHYSIOTHERAPY_DRAFT_CANDIDATES).toHaveLength(20);
    expect(within.pass).toBe(true);
    expect(within.issues).toEqual([]);
    expect(within.assessments).toHaveLength(190);
    expect(
      Math.max(
        ...within.assessments.map((assessment) => assessment.similarity),
      ),
    ).toBeLessThanOrEqual(
      physiotherapyDraftPack.designGrammar.maximumWithinIndustrySimilarity,
    );

    const cross = candidates.flatMap((candidate) =>
      dental
        .listCandidates()
        .map((dentalCandidate) =>
          assessCrossIndustryDesignDistinctness(
            candidateDesignSignature(
              physiotherapyDraftCandidateCatalog,
              candidate,
            ),
            candidateDesignSignature(dental, dentalCandidate),
            physiotherapyDraftCandidateCatalog.designGrammar,
            dental.designGrammar,
          ),
        ),
    );
    expect(cross).toHaveLength(400);
    expect(cross.every((assessment) => assessment.pass)).toBe(true);
    expect(
      Math.max(...cross.map((assessment) => assessment.similarity)),
    ).toBeLessThanOrEqual(
      physiotherapyDraftPack.designGrammar.maximumCrossIndustrySimilarity,
    );

    expect(
      candidates.every(
        (candidate) =>
          candidate.candidateStatus === "draft-unregistered" &&
          !candidate.gate.passed &&
          candidate.gate.issues.some(
            (issue) =>
              issue.code === "PHYSIOTHERAPY_DRAFT_CANDIDATE_UNCERTIFIED",
          ),
      ),
    ).toBe(true);
    expect(physiotherapyDraftPack.certificationPlan.currentCandidateCount).toBe(
      0,
    );
    const certifiedValidation = validateWithinIndustryDesignCatalog(
      physiotherapyIndustryPack,
    );
    expect(certifiedValidation.pass).toBe(true);
    expect(certifiedValidation.assessments).toHaveLength(190);
    expect(
      physiotherapyIndustryPack
        .listCandidates()
        .every(
          (candidate) =>
            candidate.candidateStatus === "certified" &&
            candidate.gate.passed,
        ),
    ).toBe(true);
  });

  test("the Dental Top 20 owns deterministic identities and passes every pair", () => {
    const dental = resolveCertifiedIndustryPackById("clinic-dental")!;
    const candidates = dental.listCandidates();
    const validation = validateWithinIndustryDesignCatalog(dental);

    expect(candidates).toHaveLength(20);
    expect(validation.pass).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.assessments).toHaveLength(190);
    expect(
      Math.max(
        ...validation.assessments.map((assessment) => assessment.similarity),
      ),
    ).toBeLessThanOrEqual(dental.designGrammar.maximumWithinIndustrySimilarity);
    expect(
      new Set(candidates.map((candidate) => candidate.visualIdentity.id)).size,
    ).toBe(20);
    for (const candidate of candidates) {
      expect(candidate.visualIdentity.id).toBe(
        `dental-${candidate.recipeId}-visual-v1`,
      );
      expect(candidate.visualIdentity.heroComposition).toBe(
        `hero-variant-${candidate.variants.hero}`,
      );
      expect(candidate.visualIdentity.visualThesis).toBe(candidate.description);
    }
  });

  test("rejects an exact candidate copy even after its candidate ID changes", () => {
    const dental = resolveCertifiedIndustryPackById("clinic-dental")!;
    const source = candidateWithinIndustryDesignSignature(
      dental,
      dental.listCandidates()[0]!,
    );
    const copied = {
      ...source,
      candidateId: "clinic-dental-renamed-copy",
    } satisfies WithinIndustryDesignSignature;
    const assessment = assessWithinIndustryDesignDistinctness(
      copied,
      source,
      dental.designGrammar,
    );

    expect(assessment.pass).toBe(false);
    expect(assessment.similarity).toBe(1);
    expect(assessment.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CANDIDATE_VISUAL_IDENTITY_REUSED",
        }),
        expect.objectContaining({
          code: "CANDIDATE_DESIGN_STRUCTURE_COPIED",
        }),
        expect.objectContaining({ code: "CANDIDATE_DESIGN_TOO_SIMILAR" }),
      ]),
    );
  });

  test("rejects a near-copy that changes only one low-impact layout slot", () => {
    const dental = resolveCertifiedIndustryPackById("clinic-dental")!;
    const source = candidateWithinIndustryDesignSignature(
      dental,
      dental.listCandidates()[0]!,
    );
    const nearCopy = {
      ...source,
      candidateId: "clinic-dental-near-copy",
      visualIdentityId: "dental-near-copy-visual-v1",
      variants: {
        ...source.variants,
        footer: source.variants.footer === 5 ? 4 : source.variants.footer + 1,
      },
      signatureMotifs: ["renamed-motif"],
    } satisfies WithinIndustryDesignSignature;
    const assessment = assessWithinIndustryDesignDistinctness(
      nearCopy,
      source,
      dental.designGrammar,
    );

    expect(assessment.pass).toBe(false);
    expect(assessment.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "CANDIDATE_DESIGN_TOO_SIMILAR" }),
      ]),
    );
    expect(assessment.issues).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CANDIDATE_DESIGN_STRUCTURE_COPIED",
        }),
      ]),
    );
  });
});
