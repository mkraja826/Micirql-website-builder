import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS } from "@micirql/design-engine";

const REQUIRED_VIEWPORTS = [360, 390, 430, 768, 1024, 1440] as const;
const REQUIRED_RENDERED_VIEWPORTS = ["mobile-360", "mobile-390", "mobile-430", "tablet-768", "desktop-1024", "desktop-1440"] as const;
const ENGINEERING_FLOOR = 8.5;
const PREMIUM_PROMOTION_FLOOR = 9;
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
  "dental-11-editorial-clinic",
  "dental-12-wellness-calm",
  "dental-13-implant-results",
  "dental-14-city-clinic",
  "dental-15-smile-campaign",
  "dental-16-multi-specialty",
  "dental-17-photo-story",
  "dental-18-proof-first",
  "dental-19-minimal-white",
  "dental-20-premium-complete",
] as const;

type VisualCertification = {
  schemaVersion: number;
  certified: boolean;
  sourceCommit: string;
  requiredViewports: string[];
  requiredLiveInteractionContract?: string;
  requiredMultipageContract?: string;
  requiredTreatmentVisualContract?: string;
  layouts: Array<{
    layoutId: string;
    passed: boolean;
    liveImplantRenderCertified?: boolean;
    multipageCertified?: boolean;
    implantTreatmentVisualCertified?: boolean;
  }>;
};

async function loadVisualCertification(): Promise<VisualCertification> {
  const certificationPath = path.join(process.cwd(), "test-results", "dental-top20-visual-evidence", "certification.json");
  return JSON.parse(await readFile(certificationPath, "utf8")) as VisualCertification;
}

function currentCommit(): string {
  return process.env.GITHUB_SHA || execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
}

test("all 20 certified dental layouts are backed by current homepage, multi-page, implant treatment and published-live evidence", async () => {
  const certification = await loadVisualCertification();
  const ids = DENTAL_LAYOUT_BLUEPRINTS.map((layout) => layout.id);
  expect(ids).toHaveLength(20);
  expect(new Set(ids).size).toBe(20);
  expect(ids).toEqual(EXPECTED_LAYOUT_IDS);
  expect(PREMIUM_PROMOTION_FLOOR).toBeGreaterThan(ENGINEERING_FLOOR);

  expect(certification.schemaVersion).toBe(11);
  expect(certification.certified, "Rendered visual certification must pass before Top-20 promotion").toBe(true);
  expect(certification.sourceCommit, "Rendered evidence is stale and does not belong to the current commit").toBe(currentCommit());
  expect(certification.requiredViewports).toEqual(REQUIRED_RENDERED_VIEWPORTS);
  expect(certification.requiredLiveInteractionContract).toBe("published-live-functional-gallery-faq-implant-render-v6");
  expect(certification.requiredMultipageContract).toBe("dental-multipage-architecture-v1");
  expect(certification.requiredTreatmentVisualContract).toBe("dental-top20-implant-treatment-six-viewport-v1");
  expect(certification.layouts).toHaveLength(20);
  expect(new Set(certification.layouts.map((entry) => entry.layoutId))).toEqual(new Set(EXPECTED_LAYOUT_IDS));
  expect(certification.layouts.every((entry) => entry.passed), "Every Dental Top-20 layout must pass rendered homepage geometry certification").toBe(true);
  expect(certification.layouts.every((entry) => entry.liveImplantRenderCertified === true), "Published runtime must render the certified Dental Implants journey before Top-20 promotion").toBe(true);
  expect(certification.layouts.every((entry) => entry.multipageCertified === true), "Every Dental Top-20 layout must pass the same-commit multi-page architecture contract").toBe(true);
  expect(certification.layouts.every((entry) => entry.implantTreatmentVisualCertified === true), "Every Dental Top-20 layout must render the Dental Implants treatment page across all six required viewports").toBe(true);

  const renderedById = new Map(certification.layouts.map((entry) => [entry.layoutId, entry.passed]));
  for (const layout of DENTAL_LAYOUT_BLUEPRINTS) {
    expect(layout.status, `${layout.id} static certification metadata is missing`).toBe("certified");
    expect(renderedById.get(layout.id), `${layout.id} has no current six-viewport rendered certification`).toBe(true);
    expect(layout.quality.minimumDesktopScore, `${layout.id} engineering desktop floor`).toBeGreaterThanOrEqual(ENGINEERING_FLOOR);
    expect(layout.quality.minimumMobileScore, `${layout.id} engineering mobile floor`).toBeGreaterThanOrEqual(ENGINEERING_FLOOR);
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
