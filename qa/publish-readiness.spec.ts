import { expect, test } from "@playwright/test";
import { assessCertifiedPublishGate } from "../apps/builder/app/certified-publish-gate";
import {
  PublishApiError,
  assertPremiumGate,
} from "../apps/builder/app/api/publish/authorization";
import { publishReadiness } from "../apps/builder/app/publish-readiness";
import { pageBlueprintsForSite } from "../apps/builder/app/pages-manager";
import { hasVisibleDentalTeamEvidence } from "../apps/builder/app/dental-content-hygiene";
import { createBuilderReviewFixture } from "./support/builder-review-fixture";

test.describe("truthful publish readiness", () => {
  test("uses the same certified release gate in the editor and publish API", () => {
    const fixture = createBuilderReviewFixture();
    const site = fixture.select(fixture.candidateIds[1]!).draft.snapshot;

    const certified = assessCertifiedPublishGate(site);
    expect(certified).toMatchObject({
      ok: true,
      packId: "clinic-dental",
      candidateId: fixture.candidateIds[1],
    });
    expect(() => assertPremiumGate(site)).not.toThrow();

    const report = publishReadiness(site);
    expect(report.ready).toBe(true);
    expect(report.blockerCount).toBe(0);
    expect(check(report, "certification")).toMatchObject({
      ok: true,
      blocking: true,
      status: "pass",
    });
    expect(check(report, "production")).toMatchObject({
      ok: false,
      blocking: false,
      status: "review",
    });
    expect(check(report, "production").detail).toContain(
      "Runs after Publish is requested",
    );
    expect(
      pageBlueprintsForSite(site).find(
        (blueprint) => blueprint.slug === "/doctors",
      )?.required,
    ).toBe(false);
  });

  test("requires a Doctors page only when visible clinician evidence exists", () => {
    const fixture = createBuilderReviewFixture();
    const site = fixture.select(fixture.candidateIds[1]!).draft.snapshot;
    const about = site.pages.find((page) => page.path === "/about");
    expect(about).toBeTruthy();
    about!.sections.push({
      id: "verified-dental-team",
      component: {
        componentId: "MIN-TEAM-001",
        version: "1.1.0",
      },
      props: {
        title: "Dental team",
        items: [{ name: "Dr Radhika", title: "Dentist" }],
      },
      bindings: {},
      hidden: false,
    });

    expect(hasVisibleDentalTeamEvidence(site)).toBe(true);
    expect(
      pageBlueprintsForSite(site).find(
        (blueprint) => blueprint.slug === "/doctors",
      )?.required,
    ).toBe(true);

    const assessment = assessCertifiedPublishGate(site);
    expect(assessment).toMatchObject({
      ok: false,
      code: "PREMIUM_GATE_STALE_OR_TAMPERED",
    });
    if (!assessment.ok) {
      expect(assessment.message).toContain("required page /doctors is missing");
    }
    expectPublishFailure(site, "PREMIUM_GATE_STALE_OR_TAMPERED");

    const report = publishReadiness(site);
    expect(report.ready).toBe(false);
    expect(check(report, "pages")).toMatchObject({
      ok: false,
      blocking: true,
      status: "block",
    });
    expect(check(report, "pages").detail).toContain("Doctors");
  });

  test("blocks a missing premium report before a publish request", () => {
    const fixture = createBuilderReviewFixture();
    const site = fixture.select(fixture.candidateIds[1]!).draft.snapshot;
    delete site.generation!.premiumGate;

    expect(assessCertifiedPublishGate(site)).toEqual({
      ok: false,
      code: "PREMIUM_REPORT_REQUIRED",
      message:
        "The exact saved revision does not contain a premium validation report.",
    });
    expectPublishFailure(site, "PREMIUM_REPORT_REQUIRED");

    const report = publishReadiness(site);
    expect(report.ready).toBe(false);
    expect(check(report, "certification").status).toBe("block");
  });

  test("fails closed when catalog identity or certified components drift", () => {
    const fixture = createBuilderReviewFixture();
    const selected = fixture.select(fixture.candidateIds[1]!).draft.snapshot;

    const staleCatalog = structuredClone(selected);
    staleCatalog.generation!.catalogVersion = "stale-dental-catalog";
    const staleAssessment = assessCertifiedPublishGate(staleCatalog);
    expect(staleAssessment).toMatchObject({
      ok: false,
      code: "PREMIUM_GATE_STALE_OR_TAMPERED",
    });
    expectPublishFailure(staleCatalog, "PREMIUM_GATE_STALE_OR_TAMPERED");
    expect(publishReadiness(staleCatalog).ready).toBe(false);

    const unapproved = structuredClone(selected);
    const section = unapproved.pages
      .flatMap((page) => page.sections)
      .find((candidate) => !candidate.hidden);
    expect(section).toBeTruthy();
    section!.component = {
      componentId: "hero.placeholder",
      version: "1.0.0",
    };
    const unapprovedAssessment = assessCertifiedPublishGate(unapproved);
    expect(unapprovedAssessment).toMatchObject({
      ok: false,
      code: "PREMIUM_GATE_STALE_OR_TAMPERED",
    });
    expectPublishFailure(unapproved, "PREMIUM_GATE_STALE_OR_TAMPERED");
    expect(check(publishReadiness(unapproved), "certification").status).toBe(
      "block",
    );
  });
});

function check(report: ReturnType<typeof publishReadiness>, id: string) {
  const result = report.checks.find((candidate) => candidate.id === id);
  expect(result, `readiness check ${id} must exist`).toBeTruthy();
  return result!;
}

function expectPublishFailure(
  site: Parameters<typeof assertPremiumGate>[0],
  code: string,
) {
  try {
    assertPremiumGate(site);
    throw new Error("Expected the publish gate to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(PublishApiError);
    expect((error as PublishApiError).status).toBe(422);
    expect((error as PublishApiError).code).toBe(code);
  }
}
