import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { groundSiteContent } from "@micirql/design-engine";

function dentalSite(heroHeading: string, serviceDescription: string): Site {
  return {
    pages: [{
      id: "home",
      sections: [
        {
          id: "hero",
          component: { componentId: "hero.test", version: "1.0.0" },
          props: { heading: heroHeading },
        },
        {
          id: "services",
          component: { componentId: "services.test", version: "1.0.0" },
          props: {
            items: [{
              title: "Dental implants",
              description: serviceDescription,
            }],
          },
        },
      ],
    }],
  } as unknown as Site;
}

const basicFacts = {
  businessName: "Nova Dental Studio",
  industry: "dental",
  subindustry: "general dentistry",
  location: "Hyderabad",
  services: ["dental implants", "crowns", "root canal treatment"],
  goals: ["build trust", "book consultations"],
};

test("unsupplied authority claims from generated Dental copy are replaced", () => {
  const result = groundSiteContent(
    dentalSite(
      "Expert Dental Care in Hyderabad",
      "Our experienced team is dedicated to providing the best possible care.",
    ),
    basicFacts,
  );

  expect(result.grounded).toBe(false);
  expect(result.issues.map((issue) => issue.reason)).toEqual([
    "unsupplied expertise or trust claim",
    "unsupplied expertise or trust claim",
  ]);
  expect(result.issues[0]?.field).toBe("heading");
  expect(result.issues[1]?.field).toBe("items[0].description");

  const [hero, services] = result.site.pages[0]!.sections;
  expect((hero?.props as { heading?: string }).heading).toBe("Dental Care in Hyderabad");
  expect((services?.props as { items?: Array<{ description?: string }> }).items?.[0]?.description)
    .toBe("Explore the services available and choose what best matches your needs.");
});

test("an explicitly supplied authority claim can be retained", () => {
  const result = groundSiteContent(
    dentalSite("Dental Care in Hyderabad", "Our experienced dental team can discuss implant options with you."),
    { ...basicFacts, notes: "The clinic describes its dental team as experienced." },
  );

  expect(result.grounded).toBe(true);
  expect(result.issues).toHaveLength(0);
});

test("one supplied authority adjective does not hide another unsupported claim", () => {
  const result = groundSiteContent(
    dentalSite("Expert Dental Care in Hyderabad", "Our expert and experienced dental team can discuss your options."),
    { ...basicFacts, notes: "The clinic supplied the description expert." },
  );

  expect(result.grounded).toBe(false);
  expect(result.issues).toHaveLength(2);
  expect(result.issues.every((issue) => issue.reason === "unsupplied expertise or trust claim")).toBe(true);
});
