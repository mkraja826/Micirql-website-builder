import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { applyDentalFaqIntelligence } from "../apps/builder/app/dental-faq-intelligence";
import type { OnboardingProfile } from "../apps/builder/app/preset-ranking";

function baseSite(): Site {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-dental-faq-test",
    workspaceId: "workspace-test",
    name: "Aurelia Dental",
    domain: "clinic",
    subtype: "dental",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#302b63",
          secondary: "#514a9d",
          accent: "#7259d9",
          background: "#ffffff",
          surface: "#f7f7fb",
          textPrimary: "#18171f",
          textSecondary: "#5e5b68",
          border: "#d9d7e2",
          success: "#147a48",
          warning: "#9a6700",
          error: "#b42318",
        },
        typography: { display: "Manrope", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "appointments",
      targetLocations: [],
      priorityTopics: ["dental care"],
      audiences: ["patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      seo: {
        title: "Aurelia Dental",
        description: "Clinical dental care with clear treatment planning.",
        canonicalPath: "/",
        indexable: true,
        structuredDataTypes: ["Organization"],
      },
      sections: [
        section("nav", "MIN-NAV-001", { title: "Aurelia Dental" }),
        section("hero", "MIN-HERO-001", { title: "Dental care planned around your needs", description: "Assessment-led care with clear next steps." }),
        section("services", "MIN-SERV-001", { title: "Treatments", items: [{ title: "Consultation", description: "Individual assessment and treatment planning." }] }),
        section("process", "MIN-PROC-001", { title: "Your treatment journey", items: [{ title: "Assessment", description: "We assess your oral health and discuss suitable next steps." }] }),
        section("proof", "MIN-TEST-001", { title: "Clinical confidence", items: [{ title: "Doctor-led care", description: "Treatment is planned after an individual clinical assessment." }] }),
        section("cta", "MIN-CTA-001", { title: "Ready to discuss your options?", primaryAction: { label: "Book consultation", href: "#contact" } }),
        section("contact", "MIN-CONT-001", { title: "Book a consultation", primaryAction: { label: "Request appointment", href: "/contact" } }),
        section("footer", "MIN-FOOT-001", { title: "Aurelia Dental", items: [] }),
      ],
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  };
}

function section(id: string, componentId: string, props: Record<string, unknown>) {
  return { id, component: { componentId, version: "1.0.0" }, props, bindings: {}, hidden: false };
}

function faqSection(site: Site) {
  return site.pages[0]!.sections.find((entry) => entry.component.componentId.includes("-FAQ-"));
}

function profile(overrides: Partial<OnboardingProfile> = {}): OnboardingProfile {
  return {
    business_name: "Aurelia Dental",
    industry: "Dental clinic",
    subindustry: "implant dentistry",
    goals: ["book consultations"],
    services: ["dental implants"],
    required_capabilities: [],
    style_tags: ["premium", "clinical"],
    notes: "Assessment-led specialist treatment",
    ...overrides,
  };
}

test("implant briefs gain one specialty FAQ immediately before the final conversion stage", () => {
  const result = applyDentalFaqIntelligence(baseSite(), profile());
  expect(result.applied).toBe(true);
  expect(result.specialty).toBe("implant");

  const home = result.site.pages[0]!;
  const faq = faqSection(result.site);
  expect(faq).toBeTruthy();
  expect(faq?.props.faqSpecialty).toBe("implant");
  expect(faq?.props.faqMode).toBe("single");
  expect(Array.isArray(faq?.props.items) ? faq?.props.items : []).toHaveLength(4);

  const faqIndex = home.sections.findIndex((entry) => entry.id === faq?.id);
  const ctaIndex = home.sections.findIndex((entry) => entry.component.componentId.includes("-CTA-"));
  expect(faqIndex).toBe(ctaIndex - 1);
});

test("specialties produce distinct clinically cautious decision-support questions", () => {
  const implant = applyDentalFaqIntelligence(baseSite(), profile());
  const orthodontic = applyDentalFaqIntelligence(baseSite(), profile({ subindustry: "orthodontics", services: ["clear aligners", "braces"], notes: "Orthodontic treatment journey" }));

  const implantText = JSON.stringify(faqSection(implant.site)?.props.items ?? []);
  const orthoText = JSON.stringify(faqSection(orthodontic.site)?.props.items ?? []);
  expect(implantText).toContain("available bone");
  expect(orthoText).toContain("retainers");
  expect(orthoText).not.toBe(implantText);
  expect(`${implantText} ${orthoText}`).not.toMatch(/guarantee|100%|pain[- ]free|permanent result/i);
});

test("general-only dentistry does not receive a mechanical FAQ", () => {
  const result = applyDentalFaqIntelligence(baseSite(), profile({ subindustry: "general dentistry", services: ["general dentistry", "check-ups"], notes: "Family dental clinic" }));
  expect(result.applied).toBe(false);
  expect(result.reason).toBe("no-high-consideration-treatment-signal");
  expect(faqSection(result.site)).toBeUndefined();
});

test("an existing visible FAQ prevents duplicate FAQ generation", () => {
  const site = baseSite();
  site.pages[0]!.sections.splice(5, 0, section("existing-faq", "MIN-FAQ-003", {
    title: "Existing patient questions",
    items: [{ title: "What should I bring?", description: "Bring relevant dental records if available." }],
  }));

  const result = applyDentalFaqIntelligence(site, profile());
  expect(result.applied).toBe(false);
  expect(result.reason).toBe("visible-faq-already-present");
  expect(result.site.pages[0]!.sections.filter((entry) => entry.component.componentId.includes("-FAQ-"))).toHaveLength(1);
});

test("FAQ generation waits until the page has both decision support and conversion", () => {
  const site = baseSite();
  site.pages[0]!.sections = site.pages[0]!.sections.filter((entry) => !/-SERV-|-PROC-|-TEST-|-ABOUT-|-GALL-|-TEAM-|-FEAT-/.test(entry.component.componentId));
  const result = applyDentalFaqIntelligence(site, profile());
  expect(result.applied).toBe(false);
  expect(result.reason).toBe("page-journey-not-ready-for-faq");
});
