import { expect, test } from "@playwright/test";
import type { Site } from "@micirql/schema";
import { planPageMedia } from "../apps/builder/app/page-media-intelligence";

const site = {
  id: "site",
  name: "Aurelia Dental",
  status: "draft",
  theme: {
    family: "default",
    tokens: {},
    brand: { density: "comfortable", shape: "soft", motion: "subtle", typography: { display: "sans", body: "sans" } },
  },
  seoBlueprint: { targetLocations: [], priorityTopics: [] },
  pages: [{
    id: "home",
    name: "Home",
    path: "/",
    seo: { title: "Aurelia Dental", description: "Dental care" },
    sections: [{ id: "hero", hidden: false, component: { componentId: "hero.placeholder", version: "1" }, props: { title: "Dental care" } }],
  }],
} as unknown as Site;

function heroFor(context: Parameters<typeof planPageMedia>[2]) {
  const plan = planPageMedia(site, "Dental clinic", context);
  const hero = plan.sections.find((section) => section.pagePath === "/" && section.family === "hero");
  expect(hero).toBeTruthy();
  return hero!;
}

test("implant brief creates implant-specific homepage hero media intent", () => {
  const hero = heroFor({ subindustry: "implant dentistry", services: ["Dental implants", "Crowns"], goals: ["Book consultation"] });
  expect(hero.subject).toContain("implant consultation");
  expect(hero.subject).toContain("planning");
  expect(hero.preferredTags).toContain("implant");
  expect(hero.avoid.join(" ")).toContain("generic smiling-patient lifestyle photo");
  expect(hero.avoid.join(" ")).toContain("before-and-after result");
});

test("cosmetic brief creates natural-smile editorial hero intent", () => {
  const hero = heroFor({ subindustry: "cosmetic dentistry", services: ["Smile design", "Veneers"] });
  expect(hero.subject).toContain("natural-smile");
  expect(hero.preferredTags).toContain("smile-design");
  expect(hero.subject).not.toContain("implant consultation");
});

test("orthodontic and endodontic briefs receive different hero contracts", () => {
  const ortho = heroFor({ subindustry: "orthodontics", services: ["Aligners", "Braces"] });
  const endo = heroFor({ subindustry: "endodontics", services: ["Root canal treatment"] });
  expect(ortho.preferredTags).toContain("orthodontics");
  expect(ortho.subject).toContain("orthodontic consultation");
  expect(endo.preferredTags).toContain("endodontics");
  expect(endo.subject).toContain("endodontic consultation");
  expect(ortho.subject).not.toBe(endo.subject);
});
