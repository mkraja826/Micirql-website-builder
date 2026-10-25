import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  deterministicIdentityForBrief,
  isDentalBriefContext,
} from "../supabase/functions/enrich-site-content/curated-dental";
import {
  fallbackImageSubjectForBrief,
  hasIncompatibleDentalLanguage,
  isPhysiotherapyBriefContext,
  secondaryExploreActionLabel,
} from "../supabase/functions/enrich-site-content/industry-content-policy";

const dentalIdentity = {
  domain: "clinic",
  subtype: "dental",
  industry: "Dental clinic",
  subindustry: "General dentistry",
};

const physiotherapyIdentity = {
  domain: "clinic",
  subtype: "physiotherapy",
  industry: "Physiotherapy clinic",
  // Persisted identity must win even if stale free text still contains dental
  // vocabulary from an earlier test generation.
  subindustry: "Dental clinic",
};

test.describe("enrich-site-content industry boundary", () => {
  test("keeps the certified dental fallback identity and imagery unchanged", () => {
    expect(isDentalBriefContext(dentalIdentity)).toBeTruthy();
    expect(deterministicIdentityForBrief(dentalIdentity)).toEqual({
      mode: "curated",
      provider: "micirql-curated",
      model: "dental-content-v2",
    });
    expect(fallbackImageSubjectForBrief(dentalIdentity)).toBe(
      "an authentic, unoccupied dental clinic environment or relevant equipment detail; no identifiable clinicians or patients, no simulated treatment, no outcome claims",
    );
    expect(secondaryExploreActionLabel(dentalIdentity)).toBe(
      "Explore treatments",
    );

    // Preserve the narrow text fallback for pre-subtype dental drafts.
    expect(
      isDentalBriefContext({
        domain: "clinic",
        industry: "Healthcare",
        subindustry: "Dental clinic",
      }),
    ).toBeTruthy();
    expect(
      isDentalBriefContext({
        domain: "clinic",
        subtype: "orthodontics",
        industry: "Healthcare",
      }),
    ).toBeTruthy();
  });

  test("an explicit physiotherapy subtype cannot be reclassified by clinic or dental text", () => {
    expect(isDentalBriefContext(physiotherapyIdentity)).toBeFalsy();
    expect(isPhysiotherapyBriefContext(physiotherapyIdentity)).toBeTruthy();
    expect(deterministicIdentityForBrief(physiotherapyIdentity)).toEqual({
      mode: "fallback",
      provider: "deterministic",
      model: "business-brief-v1",
    });

    const imageSubject = fallbackImageSubjectForBrief(physiotherapyIdentity);
    expect(imageSubject).toContain("authentic physiotherapy clinic");
    expect(imageSubject).toContain("no visible location signage");
    expect(imageSubject).not.toMatch(
      /dental|dentist|tooth|teeth|orthodont|oral surgery/i,
    );
    expect(secondaryExploreActionLabel(physiotherapyIdentity)).toBe(
      "Explore therapies",
    );
  });

  test("generic clinic text never selects the dental fallback or dental imagery", () => {
    const genericClinic = {
      domain: "clinic",
      industry: "Healthcare clinic",
      subindustry: "Sports rehabilitation",
    };

    expect(isDentalBriefContext(genericClinic)).toBeFalsy();
    expect(isPhysiotherapyBriefContext(genericClinic)).toBeFalsy();
    expect(fallbackImageSubjectForBrief(genericClinic)).toBe(
      "an authentic Healthcare clinic environment or relevant detail; do not invent identifiable staff, customers, reviews, products, credentials, or outcomes",
    );
    expect(secondaryExploreActionLabel(genericClinic)).toBe("Explore services");
  });

  test("quarantines dental-only provider copy and image prompts for explicit non-dental sites", () => {
    expect(
      hasIncompatibleDentalLanguage(physiotherapyIdentity, {
        title: "Dental services",
        description:
          "Ask the dentist whether root canal treatment is suitable.",
      }),
    ).toBeTruthy();
    expect(
      hasIncompatibleDentalLanguage(physiotherapyIdentity, {
        prompt: "A bright dental surgery with teeth models and a dentist chair",
      }),
    ).toBeTruthy();

    expect(
      hasIncompatibleDentalLanguage(physiotherapyIdentity, {
        title: "Physiotherapy services",
        description:
          "Request an appointment at the clinic to discuss a rehabilitation plan.",
        prompt: "An unoccupied physiotherapy studio with mobility equipment",
      }),
    ).toBeFalsy();
    expect(
      hasIncompatibleDentalLanguage(dentalIdentity, {
        title: "Dental services",
        prompt: "An unoccupied dental clinic environment",
      }),
    ).toBeFalsy();
  });

  test("binds classification to the persisted snapshot and applies the guard at every provider boundary", async () => {
    const source = await readFile(
      path.resolve(
        process.cwd(),
        "supabase/functions/enrich-site-content/index.ts",
      ),
      "utf8",
    );

    expect(source).toContain(
      "brief = withSnapshotIndustryIdentity(brief, draft.snapshot);",
    );
    expect(source).toContain("fallbackImageSubjectForBrief(brief)");
    expect(source).toContain(
      "!hasIncompatibleDentalLanguage(brief, section.props)",
    );
    expect(source).toContain("!hasIncompatibleDentalLanguage(brief, image)");
    expect(source).toContain(
      "hasIncompatibleDentalLanguage(\n      brief,\n      generatedPage?.seo",
    );
    expect(source).toContain("!hasIncompatibleDentalLanguage(brief, faq)");
    expect(source).not.toContain(
      "/dental|dentist|dentistry|clinic|orthodont|oral care/i",
    );
  });
});
