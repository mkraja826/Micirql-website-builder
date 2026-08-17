import { expect, test } from "@playwright/test";
import { siteSchema } from "@micirql/schema";
import { evaluateFirstBuildQuality } from "../apps/builder/app/first-build-quality";

function makeSite() {
  return siteSchema.parse({
    schemaVersion: "1.0.0",
    siteId: "first-build-quality",
    workspaceId: "qa",
    name: "Apex Dental Care",
    domain: "clinic",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: { primary: "#315E62", secondary: "#173B40", accent: "#C49A64", background: "#FFFFFF", surface: "#F3F7F6", textPrimary: "#102427", textSecondary: "#526568", border: "#D8E2E0", success: "#167A55", warning: "#9A6500", error: "#B42318" },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: { primaryGoal: "Book appointments", targetLocations: ["Hyderabad"], priorityTopics: ["Dental implants"], audiences: ["Patients"], languages: ["en"], localSeo: true, servicePages: true, locationPages: false, blog: false },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      sections: [
        { id: "nav", component: { componentId: "navbar.placeholder", version: "1.0.0" }, props: { brandName: "Apex Dental Care" }, bindings: {}, hidden: false },
        { id: "hero", component: { componentId: "hero.placeholder", version: "1.0.0" }, props: { heading: "Dental care built around clarity", body: "Discuss your concerns, understand suitable treatment options, and request an appointment with the clinic.", primaryAction: { label: "Book appointment", href: "#contact" } }, bindings: {}, hidden: false },
        { id: "services", component: { componentId: "services.placeholder", version: "1.0.0" }, props: { heading: "Dental services", items: [{ title: "Dental implants", description: "Discuss implant treatment options and understand the next steps for your individual needs." }, { title: "Crowns", description: "Explore restorative options designed to protect and restore damaged teeth where appropriate." }] }, bindings: {}, hidden: false },
        { id: "process", component: { componentId: "process.placeholder", version: "1.0.0" }, props: { heading: "What to expect", body: "Start with a consultation, review the recommended plan, and receive clear guidance about follow-up care." }, bindings: {}, hidden: false },
        { id: "team", component: { componentId: "team.placeholder", version: "1.0.0" }, props: { heading: "Meet the team", body: "Verified clinician profiles and credentials can be added by the clinic before publication." }, bindings: {}, hidden: false },
        { id: "cta", component: { componentId: "cta.placeholder", version: "1.0.0" }, props: { heading: "Ready to speak with the clinic?", body: "Request an appointment and the clinic can help you understand suitable next steps.", primaryAction: { label: "Book appointment", href: "#contact" } }, bindings: {}, hidden: false },
        { id: "contact", component: { componentId: "contact.placeholder", version: "1.0.0" }, props: { heading: "Contact Apex Dental Care", body: "Send an enquiry to request an appointment or ask the clinic about available dental services." }, bindings: {}, hidden: false },
        { id: "footer", component: { componentId: "footer.placeholder", version: "1.0.0" }, props: { brandName: "Apex Dental Care" }, bindings: {}, hidden: false },
      ],
      seo: { title: "Apex Dental Care", description: "Dental care in Hyderabad.", canonicalPath: "/", indexable: true, structuredDataTypes: [] },
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

test("complete dental first build passes full-site readiness", () => {
  const result = evaluateFirstBuildQuality(makeSite());
  expect(result.ready, JSON.stringify(result.issues, null, 2)).toBe(true);
  expect(result.score).toBeGreaterThanOrEqual(88);
  expect(result.metrics.shallowSections).toBe(0);
});

test("heading-only content is blocked", () => {
  const site = makeSite();
  const services = site.pages[0]!.sections.find((section) => section.id === "services")!;
  services.props = { heading: "Our services" };
  const result = evaluateFirstBuildQuality(site);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "SHALLOW_SECTION" && issue.sectionId === "services")).toBe(true);
});

test("missing conversion flow is blocked", () => {
  const site = makeSite();
  site.pages[0]!.sections = site.pages[0]!.sections.filter((section) => !["cta", "contact"].includes(section.id));
  const result = evaluateFirstBuildQuality(site);
  expect(result.ready).toBe(false);
  expect(result.issues.some((issue) => issue.code === "CONVERSION_MISSING")).toBe(true);
});

test("repeated component variants are reported", () => {
  const site = makeSite();
  const process = site.pages[0]!.sections.find((section) => section.id === "process")!;
  process.component = { componentId: "team.placeholder", version: "1.0.0" };
  const result = evaluateFirstBuildQuality(site);
  expect(result.metrics.repeatedComponentVariants).toBeGreaterThan(0);
  expect(result.issues.some((issue) => issue.code === "REPEATED_VARIANT")).toBe(true);
});
