import { expect, test } from "@playwright/test";
import { SCHEMA_VERSION, siteSchema, type Site } from "@micirql/schema";
import { evaluateFunctionalPublishGate } from "../apps/builder/app/functional-publish-gate";
import { repairFunctionalPublishIssues } from "../apps/builder/app/functional-publish-repair";
import { assessPublishRepairSync } from "../apps/builder/app/publish-repair-sync";

function section(id: string, family: string, props: Record<string, unknown> = {}) {
  return {
    id,
    component: { componentId: `MIN-${family.toUpperCase()}-001`, version: "1.0.0" },
    props,
    bindings: {},
    hidden: false,
  };
}

function buildReviewedSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "publish-repair-site",
    workspaceId: "publish-repair-workspace",
    name: "Harbor Dental Care",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#315E62",
          secondary: "#173B40",
          accent: "#C49A64",
          background: "#FFFFFF",
          surface: "#F3F7F6",
          textPrimary: "#102427",
          textSecondary: "#526568",
          border: "#D8E2E0",
          success: "#167A55",
          warning: "#9A6500",
          error: "#B42318",
        },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Book dental appointments",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["Dental care"],
      audiences: ["Dental patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [
          section("hero", "hero", {
            heading: "Dental care in Hyderabad",
            body: "Clear treatment planning and an easy next step.",
            primaryAction: { label: "Book appointment", href: "#" },
          }),
        ],
        seo: {
          title: "Harbor Dental Care | Hyderabad",
          description: "Dental care in Hyderabad with clear appointment options.",
          canonicalPath: "/",
          indexable: true,
          primaryKeyword: "dentist Hyderabad",
          structuredDataTypes: ["Dentist"],
        },
      },
      {
        id: "contact",
        path: "/contact",
        name: "Contact",
        sections: [
          section("contact", "cont", {
            heading: "Contact Harbor Dental Care",
            body: "Call the clinic to request an appointment.",
            primaryAction: { label: "Call clinic", href: "tel:+914000000000" },
          }),
        ],
        seo: {
          title: "Contact Harbor Dental Care",
          description: "Contact Harbor Dental Care to request an appointment.",
          canonicalPath: "/contact",
          indexable: true,
          primaryKeyword: "contact dentist Hyderabad",
          structuredDataTypes: ["Dentist"],
        },
      },
    ],
    navigation: [
      { label: "Home", href: "/" },
      { label: "Contact", href: "/contact" },
    ],
    integrations: [],
    domains: [],
  });
}

test("detect → repair → persist → publish contract → reload stays functionally identical", () => {
  const reviewed = buildReviewedSite();
  const before = evaluateFunctionalPublishGate(reviewed);
  expect(before.ready).toBe(false);
  expect(before.issues.some((issue) => issue.code === "INVALID_ACTION")).toBe(true);

  const repair = repairFunctionalPublishIssues(reviewed);
  expect(repair.repaired).toBe(true);
  expect(repair.repairs.length).toBeGreaterThan(0);
  expect(repair.remainingIssues).toEqual([]);
  expect(evaluateFunctionalPublishGate(repair.site).ready).toBe(true);

  const savedRevision = 7;
  const sync = assessPublishRepairSync(reviewed, structuredClone(reviewed), savedRevision);
  expect(sync).toEqual({ ok: true, expectedRevision: savedRevision });
  if (!sync.ok) throw new Error("expected publish repair sync to be allowed");

  const persisted = {
    revision: sync.expectedRevision + 1,
    snapshot: siteSchema.parse(structuredClone(repair.site)),
  };
  expect(persisted.revision).toBe(8);

  const publishSnapshot = persisted.snapshot;
  const reloadedEditorSnapshot = siteSchema.parse(JSON.parse(JSON.stringify(persisted.snapshot)));
  expect(reloadedEditorSnapshot).toEqual(publishSnapshot);
  expect(evaluateFunctionalPublishGate(reloadedEditorSnapshot).ready).toBe(true);

  const hero = reloadedEditorSnapshot.pages.find((page) => page.path === "/")?.sections.find((item) => item.id === "hero");
  expect((hero?.props.primaryAction as { href?: string } | undefined)?.href).toBe("/contact");
});

test("stale final review is rejected when the saved draft changed before repair persistence", () => {
  const reviewed = buildReviewedSite();
  const newerSaved = structuredClone(reviewed);
  newerSaved.pages[0]!.sections[0]!.props = {
    ...newerSaved.pages[0]!.sections[0]!.props,
    heading: "Newer editor change that must not be overwritten",
  };

  const sync = assessPublishRepairSync(reviewed, newerSaved, 12);
  expect(sync.ok).toBe(false);
  if (sync.ok) throw new Error("expected stale reviewed draft to be rejected");
  expect(sync.code).toBe("DRAFT_CHANGED_BEFORE_PUBLISH");
  expect(sync.message).toMatch(/changed after final review/i);
});
