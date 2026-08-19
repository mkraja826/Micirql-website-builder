import { expect, test } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS } from "@micirql/design-engine";

const REQUIRED_VIEWPORTS = [360, 390, 430, 768, 1024, 1440] as const;

/**
 * This gate complements dental-top20-visual-evidence.spec.ts.
 * The evidence test exercises the production renderer at 360/390/430/768/1024/1440.
 * This contract prevents future blueprint edits from weakening the geometry rules
 * that the runtime visual gate relies on.
 */
test("Top-20 blueprints carry enforceable geometry and mobile safety contracts", async () => {
  expect(DENTAL_LAYOUT_BLUEPRINTS).toHaveLength(20);

  for (const layout of DENTAL_LAYOUT_BLUEPRINTS) {
    expect(layout.quality.requiredViewports, `${layout.id}: responsive matrix drifted`).toEqual(REQUIRED_VIEWPORTS);

    const rules = layout.quality.hardRules.map((rule) => rule.toLowerCase());
    expect(rules, `${layout.id}: horizontal-overflow contract missing`).toContain("no document-level horizontal overflow");
    expect(rules, `${layout.id}: text-collision contract missing`).toContain("no clipped or overlapping text");
    expect(rules, `${layout.id}: overlay-safety contract missing`).toContain("no accidental overlays");
    expect(rules, `${layout.id}: image-bound contract missing`).toContain("all images remain inside their composition bounds");
    expect(rules, `${layout.id}: mobile CTA contract missing`).toContain("primary cta remains visible and usable on mobile");
    expect(rules, `${layout.id}: mobile recomposition contract missing`).toContain("mobile composition must be intentionally reordered rather than desktop merely shrinking");

    const mobileRules = layout.responsive.mobile.rules.map((rule) => rule.toLowerCase());
    const desktopRules = layout.responsive.desktop.rules.map((rule) => rule.toLowerCase());

    expect(mobileRules.length, `${layout.id}: insufficient mobile art direction`).toBeGreaterThanOrEqual(4);
    expect(desktopRules.length, `${layout.id}: insufficient desktop art direction`).toBeGreaterThanOrEqual(3);

    // Require at least one explicit mobile rule that addresses geometry/stacking,
    // not merely typography or cosmetic styling.
    expect(
      mobileRules.some((rule) => /(stack|column|grid|order|width|overflow|overlay|media|image|cta|button|action|spacing|gap)/.test(rule)),
      `${layout.id}: mobile rules do not explicitly protect layout geometry`,
    ).toBe(true);

    // Require at least one desktop rule that establishes deliberate composition.
    expect(
      desktopRules.some((rule) => /(grid|column|split|asym|media|image|hero|layout|composition|width|span|offset)/.test(rule)),
      `${layout.id}: desktop rules do not explicitly establish composition`,
    ).toBe(true);
  }
});