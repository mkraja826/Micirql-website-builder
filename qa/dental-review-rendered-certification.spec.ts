import { expect, test } from "@playwright/test";
import { DENTAL_LAYOUT_BLUEPRINTS } from "@micirql/design-engine";
import { buildCertifiedDentalReviewDirections } from "../apps/builder/app/dental-review-directions";

const profile = {
  industry: "dental clinic",
  subindustry: "implant dentistry",
  goals: ["book consultation", "build trust"],
  style_tags: ["premium", "editorial"],
  required_capabilities: ["appointment booking"],
  services: ["dental implants"],
  notes: "Implant-focused clinic",
} as any;

const site = {
  siteId: "review-cert-site",
  workspaceId: "review-cert-workspace",
  name: "Aurelia Dental",
  theme: { family: "clinical" },
  pages: [{
    id: "home",
    name: "Home",
    path: "/",
    sections: [
      { id: "nav", hidden: false, component: { componentId: "DENTAL-NAV-01" }, props: {} },
      { id: "hero", hidden: false, component: { componentId: "DENTAL-HERO-01" }, props: {
        title: "Dental implants planned around your needs",
        description: "Consultation-led implant care with clear assessment and planning.",
        primaryAction: { label: "Book consultation", href: "/contact" },
        image: { src: "https://example.com/implant.jpg", ratio: "portrait" },
      } },
      { id: "services", hidden: false, component: { componentId: "DENTAL-SERVICES-01" }, props: { title: "Implant care", description: "Implant consultation, assessment and restorative planning." } },
      { id: "process", hidden: false, component: { componentId: "DENTAL-PROCESS-01" }, props: { title: "Your implant consultation", description: "Assessment, planning and clear next steps." } },
      { id: "cta", hidden: false, component: { componentId: "DENTAL-CTA-01" }, props: { title: "Plan your implant consultation", primaryAction: { label: "Book consultation", href: "/contact" } } },
    ],
  }],
} as any;

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("production Dental review fails closed without rendered certification", () => {
  withEnv({ NODE_ENV: "production", MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS: undefined }, () => {
    expect(buildCertifiedDentalReviewDirections(site, profile, 8)).toEqual([]);
  });
});

test("production Dental review admits only rendered-certified blueprint IDs", () => {
  const allowed = DENTAL_LAYOUT_BLUEPRINTS.slice(0, 2).map((entry) => entry.id);
  withEnv({ NODE_ENV: "production", MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS: allowed.join(",") }, () => {
    const directions = buildCertifiedDentalReviewDirections(site, profile, 8);
    expect(directions.every((direction) => allowed.includes(direction.id.replace(/^certified-/, "")))).toBe(true);
  });
});

test("development review remains available without runtime rendered allowlist", () => {
  withEnv({ NODE_ENV: "development", MICIRQL_DENTAL_CERTIFIED_LAYOUT_IDS: undefined }, () => {
    expect(buildCertifiedDentalReviewDirections(site, profile, 8).length).toBeGreaterThan(0);
  });
});
