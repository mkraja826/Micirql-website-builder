import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import type { Site, SitePage } from "@micirql/schema";
import { buildRenderedSeo } from "@micirql/renderer";

function pageWithFaq(): SitePage {
  return {
    id: "home",
    path: "/",
    name: "Home",
    seo: {
      title: "Aurelia Dental",
      description: "Dental implant assessment and treatment planning.",
      canonicalPath: "/",
      indexable: true,
      structuredDataTypes: ["Organization"],
    },
    sections: [
      {
        id: "faq-visible",
        component: { componentId: "MIN-FAQ-002", version: "1.0.0" },
        bindings: {},
        hidden: false,
        props: {
          title: "Implant questions",
          items: [
            { title: "  How is implant suitability assessed?  ", description: "  We assess oral health and relevant clinical factors before discussing suitable options.  " },
            { title: "How are treatment stages explained?", description: "Your clinician can outline the recommended stages after assessment." },
            { title: "Question without an answer", description: "" },
            { title: "", description: "Answer without a question" },
          ],
        },
      },
      {
        id: "faq-hidden",
        component: { componentId: "MIN-FAQ-003", version: "1.0.0" },
        bindings: {},
        hidden: true,
        props: {
          title: "Hidden questions",
          items: [{ title: "Hidden question must not appear", description: "Hidden answer must not appear." }],
        },
      },
      {
        id: "footer",
        component: { componentId: "MIN-FOOT-001", version: "1.0.0" },
        bindings: {},
        hidden: false,
        props: { title: "Aurelia Dental" },
      },
    ],
  };
}

function site(page: SitePage): Site {
  return {
    schemaVersion: "1.0.0",
    siteId: "site-faq-jsonld-test",
    workspaceId: "workspace-test",
    name: "Aurelia Dental",
    domain: "clinic",
    theme: {
      family: "minimalist",
      modifiers: [],
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
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [page],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  };
}

function faqSchema(result: ReturnType<typeof buildRenderedSeo>) {
  return result.structuredData.find((entry) => entry["@type"] === "FAQPage") as Record<string, unknown> | undefined;
}

test("FAQPage JSON-LD uses the exact trimmed visible questions and answers", () => {
  const page = pageWithFaq();
  const rendered = buildRenderedSeo(site(page), page, "https://aurelia.example");
  const faq = faqSchema(rendered);
  expect(faq).toBeTruthy();

  expect(faq?.mainEntity).toEqual([
    {
      "@type": "Question",
      name: "How is implant suitability assessed?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We assess oral health and relevant clinical factors before discussing suitable options.",
      },
    },
    {
      "@type": "Question",
      name: "How are treatment stages explained?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your clinician can outline the recommended stages after assessment.",
      },
    },
  ]);

  const serialized = JSON.stringify(faq);
  expect(serialized).not.toContain("Hidden question must not appear");
  expect(serialized).not.toContain("Question without an answer");
});

test("duplicate visible questions are represented once using the first visible answer", () => {
  const page = pageWithFaq();
  page.sections.splice(1, 0, {
    id: "faq-second-visible",
    component: { componentId: "FAQ.placeholder", version: "1.0.0" },
    bindings: {},
    hidden: false,
    props: {
      title: "More questions",
      items: [
        { title: "How are treatment stages explained?", description: "A conflicting duplicate answer that must not replace visible source order." },
        { title: "Can I ask questions before deciding?", description: "Yes. The consultation is an opportunity to discuss the proposed plan before proceeding." },
      ],
    },
  });

  const rendered = buildRenderedSeo(site(page), page, "https://aurelia.example");
  const entities = (faqSchema(rendered)?.mainEntity ?? []) as Array<Record<string, unknown>>;
  expect(entities.filter((entry) => entry.name === "How are treatment stages explained?")).toHaveLength(1);
  expect(entities.map((entry) => entry.name)).toContain("Can I ask questions before deciding?");
});

test("pages without visible valid FAQ pairs do not emit FAQPage structured data", () => {
  const page = pageWithFaq();
  page.sections = page.sections.map((section) => section.component.componentId.includes("-FAQ-") ? { ...section, hidden: true } : section);
  const rendered = buildRenderedSeo(site(page), page, "https://aurelia.example");
  expect(faqSchema(rendered)).toBeUndefined();
});

test("FAQ renderer and FAQPage use the same complete-pair eligibility contract", async () => {
  const [sectionSource, seoSource] = await Promise.all([
    readFile("packages/sections/src/faq-sections.tsx", "utf8"),
    readFile("packages/renderer/src/seo.ts", "utf8"),
  ]);

  expect(sectionSource).toContain(".filter((entry) => entry.question && entry.answer)");
  expect(sectionSource).not.toContain("Contact us and we will explain the next step clearly.");
  expect(sectionSource).toContain("text(item.title)");
  expect(sectionSource).toContain("text(item.description)");
  expect(seoSource).toContain("if (!question || !answer || seenQuestions.has(question)) continue;");
  expect(seoSource).toContain("if (section.hidden || !isFaqComponent(section.component.componentId)) continue;");
});
