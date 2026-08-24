import { test, expect } from "@playwright/test";
import { evaluateWebsiteContent } from "@micirql/design-engine";
import { evaluateDentalContentQuality } from "../apps/builder/app/dental-content-quality";
import { prepareContentScaffold } from "../apps/builder/app/content-scaffold-preparation";
import { evaluateFinalGenerationAcceptance } from "../apps/builder/app/final-generation-acceptance";

const profile = {
  industry: "Dental clinic",
  subindustry: "implant dentistry",
  services: ["Dental implants", "Smile design", "Crowns and veneers"],
  goals: ["Book consultations"],
  notes: "Premium implant-focused clinic with before and after cases and WhatsApp booking",
};

function siteWith(heroTitle: string, heroDescription: string, ctaLabel: string, serviceCopy: string) {
  return {
    schemaVersion: 1,
    siteId: "site-test",
    name: "Aurelia Dental",
    defaultLocale: "en",
    theme: {
      family: "luxury",
      modifiers: [],
      brand: {
        colors: { primary: "#111111", secondary: "#333333", accent: "#b9a77a", background: "#ffffff", surface: "#f7f5f0", textPrimary: "#111111", textSecondary: "#555555", border: "#dddddd" },
        typography: { display: "serif", body: "sans", ui: "sans" },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    pages: [{
      id: "home",
      path: "/",
      title: "Home",
      seo: { title: "Aurelia Dental", description: "Premium dental care" },
      sections: [
        { id: "nav", component: { componentId: "luxury-nav-01", version: "1" }, props: { title: "Aurelia Dental" } },
        { id: "hero", component: { componentId: "luxury-hero-01", version: "1" }, props: { title: heroTitle, description: heroDescription, primaryAction: { label: ctaLabel, href: "#contact" } } },
        { id: "services", component: { componentId: "luxury-serv-01", version: "1" }, props: { title: "Treatments", items: [{ title: "Dental implants", description: serviceCopy }, { title: "Smile design", description: "Cosmetic planning for veneers and smile improvement." }] } },
        { id: "process", component: { componentId: "luxury-proc-01", version: "1" }, props: { title: "Your treatment plan", description: "Consultation, scan, planning, treatment and follow-up are explained before care begins.", items: [{ title: "Assessment", description: "Clinical assessment and imaging." }] } },
        { id: "testimonials", component: { componentId: "luxury-test-01", version: "1" }, props: { title: "Patient stories", description: "Review verified cases, before-and-after outcomes and patient feedback.", items: [{ title: "Case review", description: "Verified treatment result." }] } },
        { id: "contact", component: { componentId: "luxury-cont-01", version: "1" }, props: { title: "Book a consultation", description: "Request an appointment with the clinic.", primaryAction: { label: ctaLabel, href: "#" } } },
      ],
    }],
  } as any;
}

test("rejects polished but generic dental copy", () => {
  const result = evaluateDentalContentQuality(
    siteWith("Your smile, our priority", "Modern dental care designed around you.", "Learn more", "High-quality dental care."),
    profile as any,
  );
  expect(result.issues.some((issue) => issue.code === "GENERIC_DENTAL_HERO")).toBeTruthy();
  expect(result.issues.some((issue) => issue.code === "DENTAL_CTA_TOO_GENERIC")).toBeTruthy();
  expect(result.score).toBeLessThan(82);
});

test("accepts implant-specific premium dental copy", () => {
  const result = evaluateDentalContentQuality(
    siteWith("Dental implants planned around your smile", "Implant dentistry, smile design and restorative planning with a clear consultation-first approach.", "Book consultation", "Implant treatment planned from assessment and scan through restoration and review."),
    profile as any,
  );
  expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  expect(result.score).toBeGreaterThanOrEqual(82);
});

test("central content quality accepts heading and body section aliases", () => {
  const site = siteWith(
    "Dental implants planned around your smile",
    "Implant dentistry, smile design and restorative planning with a clear consultation-first approach.",
    "Book consultation",
    "Implant treatment planned from assessment and scan through restoration and review.",
  );

  for (const page of site.pages) {
    for (const section of page.sections) {
      const props = section.props as Record<string, unknown>;
      if (typeof props.title === "string") {
        props.heading = props.title;
        delete props.title;
      }
      if (typeof props.description === "string") {
        props.body = props.description;
        delete props.description;
      }
    }
  }

  const result = evaluateWebsiteContent(site as any);
  expect(result.issues.filter((issue) => issue.code === "MISSING_SECTION_TITLE")).toHaveLength(0);
  expect(result.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  expect(result.score).toBeGreaterThanOrEqual(82);
});

test("raw Dental scaffold becomes a truthful architecture-safe foundation before AI", () => {
  const rawSite = {
    schemaVersion: "1.0.0",
    siteId: "site-scaffold",
    workspaceId: "workspace-scaffold",
    name: "My Business",
    domain: "clinic",
    subtype: "implant-dentistry",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#5B4AE5", secondary: "#17171C", accent: "#5B4AE5", background: "#FFFFFF", surface: "#F5F5F7",
          textPrimary: "#17171C", textSecondary: "#6E6E7A", border: "#DDDDE3", success: "#177A55", warning: "#AD6A00", error: "#C93636",
        },
        typography: { display: "Georgia, serif", body: "Inter, sans-serif", ui: "Inter, sans-serif" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Book dental consultations", targetLocations: [], priorityTopics: [], audiences: [], languages: ["en"], localSeo: false, servicePages: true, locationPages: false, blog: false,
    },
    pages: [{
      id: "home", path: "/", name: "Home",
      sections: [
        { id: "navbar-1", component: { componentId: "navbar.placeholder", version: "1.0.0" }, props: { heading: "Nav", body: "Content for this section will be tailored to your business." }, bindings: {}, hidden: false },
        { id: "hero-2", component: { componentId: "hero.placeholder", version: "1.0.0" }, props: { heading: "Pearl Dental", body: "A tailored website is being prepared from your business brief." }, bindings: {}, hidden: false },
        { id: "team-3", component: { componentId: "team.placeholder", version: "1.0.0" }, props: { heading: "Doctor", body: "Content for this section will be tailored to your business.", items: [] }, bindings: {}, hidden: false },
        { id: "services-4", component: { componentId: "services.placeholder", version: "1.0.0" }, props: { heading: "Our services", body: "Explore the services and solutions we provide.", items: [] }, bindings: {}, hidden: false },
        { id: "features-5", component: { componentId: "features.placeholder", version: "1.0.0" }, props: { heading: "Technology", body: "Content for this section will be tailored to your business.", items: [] }, bindings: {}, hidden: false },
        { id: "process-6", component: { componentId: "process.placeholder", version: "1.0.0" }, props: { heading: "Process", body: "Content for this section will be tailored to your business.", items: [] }, bindings: {}, hidden: false },
        { id: "testimonials-7", component: { componentId: "testimonials.placeholder", version: "1.0.0" }, props: { heading: "Proof", body: "Content for this section will be tailored to your business.", items: [] }, bindings: {}, hidden: false },
        { id: "cta-8", component: { componentId: "cta.placeholder", version: "1.0.0" }, props: { heading: "Cta", body: "Content for this section will be tailored to your business." }, bindings: {}, hidden: false },
        { id: "contact-9", component: { componentId: "contact.placeholder", version: "1.0.0" }, props: { heading: "Get in touch", body: "Contact us to discuss how we can help." }, bindings: {}, hidden: false },
        { id: "footer-10", component: { componentId: "footer.placeholder", version: "1.0.0" }, props: { heading: "Footer", body: "Content for this section will be tailored to your business." }, bindings: {}, hidden: false },
      ],
      seo: { title: "Pearl Dental", description: "Dental care in Hyderabad", canonicalPath: "/", indexable: true, structuredDataTypes: [] },
    }],
    navigation: [{ label: "Home", href: "/" }], integrations: [], domains: [],
  } as any;

  const prepared = prepareContentScaffold(rawSite, {
    businessName: "Pearl Dental",
    industry: "dental",
    subindustry: "implant-dentistry",
    location: "Hyderabad",
    services: ["Dental implants", "Full-mouth rehabilitation", "Cosmetic dentistry"],
    goals: ["Book consultations", "Build trust"],
    notes: null,
    people: [], credentials: [], proofClaims: [], prices: [],
  } as any);

  const visible = prepared.site.pages[0]!.sections.filter((section) => !section.hidden);
  const copy = JSON.stringify(visible.map((section) => section.props)).toLowerCase();
  const actions = visible.flatMap((section) => {
    const action = section.props.primaryAction;
    return action && typeof action === "object" && !Array.isArray(action) ? [action as Record<string, unknown>] : [];
  });

  expect(prepared.changed).toBeTruthy();
  expect(copy).not.toContain("content for this section will be tailored");
  expect(copy).not.toContain("a tailored website is being prepared");
  expect(copy).toContain("dental implants");
  expect(actions.filter((action) => action.label === "Book consultation" && action.href === "#contact-9")).toHaveLength(2);
  expect(prepared.site.pages[0]!.sections.find((section) => section.id === "team-3")?.hidden).toBeTruthy();
  expect(prepared.site.pages[0]!.sections.find((section) => section.id === "testimonials-7")?.hidden).toBeTruthy();

  const central = evaluateWebsiteContent(prepared.site);
  expect(central.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  expect(central.score).toBeGreaterThanOrEqual(82);

  const dental = evaluateDentalContentQuality(prepared.site, profile as any);
  expect(dental.issues.filter((issue) => issue.severity === "error")).toHaveLength(0);
  expect(dental.score).toBeGreaterThanOrEqual(82);

  const acceptance = evaluateFinalGenerationAcceptance(prepared.site);
  for (const id of ["content", "typography", "imagery", "mobile-structure"] as const) {
    expect(acceptance.dimensions.find((dimension) => dimension.id === id)?.ready).toBeTruthy();
  }
  expect(acceptance.ready).toBeFalsy();
  expect(acceptance.dimensions.filter((dimension) => !dimension.ready).every((dimension) => dimension.id === "premium" || dimension.id === "flagship-visual")).toBeTruthy();
});
