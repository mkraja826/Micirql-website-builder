import { SCHEMA_VERSION, siteSchema } from "@micirql/schema";
import {
  createJsonContentExecutor,
  createModelExecutorRegistry,
  generateGuardedSiteContent,
  type ModelProfile,
} from "@micirql/ai";
import {
  CLOUDFLARE_CONTENT_MODEL,
  CLOUDFLARE_CONTENT_PROFILE_ID,
  createWorkersAiJsonPlannerModel,
} from "../../../cloudflare-workers-ai-text";

export async function GET() {
  const planner = createWorkersAiJsonPlannerModel({ maxOutputTokens: 6_000 });
  if (!planner) {
    return Response.json({ ok: false, code: "WORKERS_AI_BINDING_UNAVAILABLE" }, { status: 503 });
  }

  const profile: ModelProfile = {
    id: CLOUDFLARE_CONTENT_PROFILE_ID,
    provider: "cloudflare-workers-ai",
    model: CLOUDFLARE_CONTENT_MODEL,
    capabilities: ["content-generation"],
    enabled: true,
    qualityScore: 86,
    latencyClass: "low",
    costClass: "low",
    maxOutputTokens: 6_000,
  };

  const site = siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "guarded-content-canary",
    workspaceId: "guarded-content-canary",
    name: "Nova Dental Studio",
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
          error: "#B42318"
        },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle"
      }
    },
    seoBlueprint: {
      primaryGoal: "Build trust and book consultations",
      targetLocations: ["Hyderabad"],
      priorityTopics: ["Dental implants", "Crowns", "Root canal treatment"],
      audiences: ["Dental patients"],
      languages: ["en"],
      localSeo: true,
      servicePages: true,
      locationPages: false,
      blog: false
    },
    pages: [{
      id: "home",
      path: "/",
      name: "Home",
      sections: [
        section("global-navbar", "navbar", "background", { brandName: "Nova Dental Studio" }),
        section("hero", "hero", "background", {
          eyebrow: "Dental care in Hyderabad",
          heading: "Dental care with a clear path to consultation",
          body: "Explore dental implants, crowns and root canal treatment, then contact the clinic to discuss your needs.",
          primaryAction: { label: "Book consultation", href: "#contact" }
        }),
        section("services", "services", "surface", {
          heading: "Dental services",
          body: "Review the services available before contacting the clinic.",
          items: [
            { title: "Dental implants", description: "Discuss dental implant options with the clinic." },
            { title: "Crowns", description: "Learn about crowns and the questions to discuss during a consultation." },
            { title: "Root canal treatment", description: "Learn about root canal treatment and contact the clinic for information relevant to your needs." }
          ]
        }),
        section("process", "process", "background", {
          heading: "What happens next",
          items: [
            { title: "Request a consultation", description: "Contact the clinic to request a consultation." },
            { title: "Discuss your needs", description: "Share the reason for your visit and ask about suitable next steps." },
            { title: "Plan the next step", description: "Confirm the next step with the clinic after your consultation." }
          ]
        }),
        section("cta", "cta", "accent", {
          heading: "Ready to discuss your dental care?",
          body: "Contact Nova Dental Studio to request a consultation.",
          primaryAction: { label: "Book consultation", href: "#contact" }
        }),
        section("contact", "contact", "surface", {
          heading: "Contact Nova Dental Studio",
          body: "Request a consultation with the clinic in Hyderabad.",
          primaryAction: { label: "Contact clinic", href: "#contact" }
        }),
        section("global-footer", "footer", "background", { brandName: "Nova Dental Studio" })
      ],
      seo: {
        title: "Nova Dental Studio | Dental Care in Hyderabad",
        description: "Explore dental implants, crowns and root canal treatment in Hyderabad and contact Nova Dental Studio to request a consultation.",
        canonicalPath: "/",
        indexable: true,
        primaryKeyword: "dental implants Hyderabad",
        structuredDataTypes: ["Dentist", "MedicalClinic"]
      }
    }],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: []
  });

  try {
    const result = await generateGuardedSiteContent({
      site,
      facts: {
        businessName: "Nova Dental Studio",
        industry: "dental",
        subindustry: "general dentistry",
        location: "Hyderabad",
        services: ["Dental implants", "Crowns", "Root canal treatment"],
        goals: ["Build trust", "Book consultations"],
        notes: null,
      },
      profiles: [profile],
      executors: createModelExecutorRegistry([createJsonContentExecutor(planner)]),
    });

    const page = result.site.pages[0];
    const hero = page?.sections.find((item) => item.id === "hero");
    const services = page?.sections.find((item) => item.id === "services");
    const cta = page?.sections.find((item) => item.id === "cta");

    return Response.json({
      ok: true,
      model: result.model,
      audit: {
        appliedFields: result.appliedFields,
        structureIntact: result.structureIntact,
        restoredChanges: result.restoredChanges,
        groundingIssues: result.groundingIssues,
      },
      content: {
        seo: page?.seo,
        hero: hero?.props,
        services: services?.props,
        cta: cta?.props,
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({
      ok: false,
      code: "GUARDED_CONTENT_CANARY_FAILED",
      error: error instanceof Error ? error.message : "Unknown guarded content failure",
    }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}

function section(id: string, family: string, paletteRole: string, props: Record<string, unknown>) {
  return {
    id,
    component: { componentId: `${family}.canary-v1`, version: "1.0.0" },
    props: { paletteRole, ...props },
    bindings: {},
    hidden: false,
  };
}
