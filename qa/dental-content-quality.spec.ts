import { test, expect } from "@playwright/test";
import { evaluateDentalContentQuality } from "../apps/builder/app/dental-content-quality";

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
