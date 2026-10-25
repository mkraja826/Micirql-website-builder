import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  dentalServiceDescription,
  deterministicIdentityForBrief,
  mergeCuratedDentalSectionProps,
  sanitizeExistingSectionProps,
} from "../supabase/functions/enrich-site-content/curated-dental";

test.describe("curated dental content recovery", () => {
  test("uses an honest non-metered identity only for dental briefs", () => {
    expect(
      deterministicIdentityForBrief({
        industry: "Healthcare",
        subindustry: "Dental clinic",
      }),
    ).toEqual({
      mode: "curated",
      provider: "micirql-curated",
      model: "dental-content-v2",
    });

    expect(
      deterministicIdentityForBrief({
        industry: "Hospitality",
        subindustry: "Restaurant",
      }),
    ).toEqual({
      mode: "fallback",
      provider: "deterministic",
      model: "business-brief-v1",
    });
  });

  test("preserves strong scaffold copy, removes authoring text, and enriches weak dental service copy", () => {
    const strongDescription =
      "Implant consultations review the missing tooth, supporting structures and questions that may inform a dentist's assessment before options are compared.";
    const merged = mergeCuratedDentalSectionProps(
      "services",
      {
        title: "Care options for your visit",
        description:
          "Add verified clinic copy here once the clinic supplies approved information.",
        items: [
          { title: "Dental implants", description: strongDescription },
          {
            title: "Teeth cleaning",
            description: "Learn more and contact us.",
          },
        ],
        image: { src: "https://images.example/clinic.jpg" },
      },
      {
        title: "Dental services",
        description:
          "Review the listed services, then request an appointment to discuss suitable next steps.",
        items: [
          {
            title: "Dental implants",
            description: dentalServiceDescription(
              "Dental implants",
              "Radhika Dental",
            ),
          },
          {
            title: "Teeth cleaning",
            description: dentalServiceDescription(
              "Teeth cleaning",
              "Radhika Dental",
            ),
          },
        ],
      },
    );

    expect(merged.title).toBe("Care options for your visit");
    expect(merged.description).toContain("Review the listed services");
    expect(JSON.stringify(merged)).not.toMatch(/add verified|once the clinic/i);
    expect(merged.items).toEqual([
      expect.objectContaining({
        title: "Dental implants",
        description: strongDescription,
      }),
      expect.objectContaining({
        title: "Teeth cleaning",
        description: expect.stringMatching(/routine assessment/i),
      }),
    ]);

    const sanitized = sanitizeExistingSectionProps({
      title: "Clinic information",
      description:
        "Introduce the people behind the clinic using only approved names.",
      image: { src: "https://images.example/clinic.jpg" },
    });
    expect(sanitized).toEqual({
      title: "Clinic information",
      image: { src: "https://images.example/clinic.jpg" },
    });
  });

  test("keeps provider failure latency bounded and never meters curated output", async () => {
    const source = await readFile(
      path.resolve(
        process.cwd(),
        "supabase/functions/enrich-site-content/index.ts",
      ),
      "utf8",
    );

    expect(source).toContain("const PAGE_GENERATION_CONCURRENCY = 5;");
    expect(source).toContain("const PAGE_GENERATION_MAX_ATTEMPTS = 1;");
    expect(source).toContain("const PAGE_GENERATION_TIMEOUT_MS = 35_000;");
    expect(source).toContain('if (mode === "model" || mode === "partial")');
    expect(source).toContain(
      'type EnrichmentMode = "model" | "partial" | "curated" | "fallback";',
    );
  });
});
