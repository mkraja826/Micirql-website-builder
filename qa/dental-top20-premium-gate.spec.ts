import { expect, test } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS } from "@micirql/design-engine";

const REQUIRED_VIEWPORTS = [360, 390, 430, 768, 1024, 1440] as const;
const REQUIRED_HARD_RULES = [
  "no document-level horizontal overflow",
  "no clipped or overlapping text",
  "no accidental overlays",
  "primary CTA remains visible and usable on mobile",
  "all images remain inside their composition bounds",
  "mobile composition must be intentionally reordered rather than desktop merely shrinking",
] as const;

const EXPECTED_LAYOUT_IDS = [
  "dental-01-clinical-authority",
  "dental-02-implant-luxury",
  "dental-03-smile-studio",
  "dental-04-family-care",
  "dental-05-digital-dentistry",
  "dental-06-doctor-brand",
  "dental-07-conversion-engine",
  "dental-08-boutique-cosmetic",
  "dental-09-ortho-journey",
  "dental-10-emergency-trust",
  "dental-11-dental-journal",
  "dental-12-wellness-calm",
  "dental-13-implant-results",
  "dental-14-city-clinic",
  "dental-15-smile-campaign",
  "dental-16-multi-specialty-hub",
  "dental-17-clinic-story",
  "dental-18-proof-first",
  "dental-19-quiet-precision",
  "dental-20-complete-signature",
] as const;

test("all 20 certified dental layouts are present and premium-gated", async () => {
  const ids = DENTAL_LAYOUT_BLUEPRINTS.map((layout) => layout.id);
  expect(ids).toHaveLength(20);
  expect(new Set(ids).size).toBe(20);
  expect(ids).toEqual(EXPECTED_LAYOUT_IDS);

  for (const layout of DENTAL_LAYOUT_BLUEPRINTS) {
    expect(layout.status, `${layout.id} must be certified before Top-20 review`).toBe("certified");
    expect(layout.quality.minimumDesktopScore, `${layout.id} desktop quality floor`).toBeGreaterThanOrEqual(9);
    expect(layout.quality.minimumMobileScore, `${layout.id} mobile quality floor`).toBeGreaterThanOrEqual(9);
    expect(layout.quality.requiredViewports, `${layout.id} must declare the complete responsive matrix`).toEqual(REQUIRED_VIEWPORTS);
    for (const rule of REQUIRED_HARD_RULES) {
      expect(layout.quality.hardRules, `${layout.id} is missing hard rule: ${rule}`).toContain(rule);
    }
    expect(layout.responsive.mobile.rules.length, `${layout.id} needs explicit mobile art direction`).toBeGreaterThanOrEqual(4);
    expect(layout.responsive.desktop.rules.length, `${layout.id} needs explicit desktop art direction`).toBeGreaterThanOrEqual(3);
    expect(layout.sections[0]?.family, `${layout.id} must begin with navigation`).toBe("navbar");
    expect(layout.sections[1]?.family, `${layout.id} must open with a hero`).toBe("hero");
    expect(layout.sections.at(-1)?.family, `${layout.id} must close with a footer`).toBe("footer");
  }
});
