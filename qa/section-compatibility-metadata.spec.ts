import { expect, test } from "@playwright/test";
import {
  compatibleCertifiedVariantsFor,
  isSectionVariantCompatible,
  resolvePremiumCertifiedVariant,
  sectionVariantCertification,
} from "@micirql/sections";

test("premium certification exposes compatibility metadata", () => {
  const certification = sectionVariantCertification("hero", 4);
  expect(certification.approvedForGeneration).toBe(true);
  expect(certification.compatibility.responsiveCertified).toBe(true);
  expect(certification.compatibility.accessibilityCertified).toBe(true);
  expect(certification.compatibility.artDirections).toContain("editorial-minimal");
  expect(certification.compatibility.contentRequirements).toContain("heading");
});

test("immersive variants are not selected for incompatible art direction", () => {
  expect(isSectionVariantCompatible("gallery", 5, {
    artDirection: "warm-modern",
    density: "spacious",
  })).toBe(false);

  const resolved = resolvePremiumCertifiedVariant("gallery", 5, {
    artDirection: "warm-modern",
    density: "spacious",
  });
  expect(resolved).toBe(4);
});

test("adjacent dense section families cannot repeat the same family", () => {
  expect(isSectionVariantCompatible("services", 3, {
    artDirection: "quiet-premium",
    density: "spacious",
    previousFamily: "services",
  })).toBe(false);
  expect(compatibleCertifiedVariantsFor("services", {
    previousFamily: "services",
  })).toHaveLength(0);
});

test("content requirements can fail compatibility before rendering", () => {
  expect(isSectionVariantCompatible("hero", 2, {
    artDirection: "quiet-premium",
    density: "spacious",
    availableContent: ["heading", "body", "action"],
  })).toBe(false);
  expect(isSectionVariantCompatible("hero", 2, {
    artDirection: "quiet-premium",
    density: "spacious",
    availableContent: ["heading", "body", "action", "image"],
  })).toBe(true);
});

test("conversion sections expose preferred narrative neighbors", () => {
  const cta = sectionVariantCertification("cta", 4).compatibility;
  expect(cta.preferredPreviousFamilies).toContain("process");
  expect(cta.preferredNextFamilies).toContain("contact");
});
