import {
  siteSchema,
  type BrandInput,
  type BrandProvenance,
  type Site,
  type SiteSection,
} from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";
import { applyBrandInput } from "../../brand-provenance";
import { physiotherapyDraftPack } from "./physiotherapy";
import { applyPhysiotherapyDraftContentHygiene } from "./physiotherapy-content-hygiene";
import { applyPhysiotherapyDraftMedia } from "./physiotherapy-media";

export type VerifiedPhysiotherapyProfile = {
  name: string;
  role?: string | null;
  credentials?: string[] | null;
  verified: true;
};

export type PhysiotherapyDraftBrief = {
  businessName: string;
  location?: string | null;
  services: string[];
  conditions?: string[] | null;
  goals: string[];
  languages: string[];
  notes?: string | null;
  phone?: string | null;
  openingHours?: string[] | null;
  therapists?: VerifiedPhysiotherapyProfile[] | null;
};

/**
 * Draft-only scaffold for the next industry pilot. It is intentionally not
 * wired to the certified runtime registry; production onboarding cannot call
 * it until the pack has 20 candidates and passes visual release gates.
 */
export function createPhysiotherapyDraftScaffold(
  source: Site,
  brief: PhysiotherapyDraftBrief,
  brandInput?: BrandInput,
  brandProvenance?: BrandProvenance,
): Site {
  const next = structuredClone(source);
  const services = uniquePublicLabels(brief.services);
  const conditions = uniquePublicLabels(brief.conditions ?? []);
  const therapists = (brief.therapists ?? []).filter(
    (profile) => profile.verified && profile.name.trim(),
  );
  const navigation = physiotherapyDraftPack.pages.map((page) => ({
    label: page.label,
    href: page.path,
  }));

  next.name = brief.businessName.trim();
  next.domain = physiotherapyDraftPack.identity.domain;
  next.subtype = physiotherapyDraftPack.identity.subtype;
  next.navigation = navigation;
  next.theme = applyBrandInput(
    {
      family: "organic",
      modifiers: ["light", "rounded", "motion-subtle"],
      brand: {
        colors: {
          primary: physiotherapyDraftPack.palette.colors.primary,
          secondary: physiotherapyDraftPack.palette.colors.ink,
          accent: physiotherapyDraftPack.palette.colors.accent,
          background: physiotherapyDraftPack.palette.colors.background,
          surface: physiotherapyDraftPack.palette.colors.surface,
          textPrimary: physiotherapyDraftPack.palette.colors.ink,
          textSecondary: physiotherapyDraftPack.palette.colors.textMuted,
          border: physiotherapyDraftPack.palette.colors.border,
          success: "#287A58",
          warning: "#8A5A18",
          error: physiotherapyDraftPack.palette.colors.error,
        },
        typography: {
          display:
            "Manrope, Segoe UI Variable Display, Segoe UI, Arial, sans-serif",
          body: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
          ui: "Inter, Segoe UI Variable Text, Segoe UI, Arial, sans-serif",
        },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    brandInput,
    brandProvenance,
  );
  next.seoBlueprint = {
    ...next.seoBlueprint,
    primaryGoal:
      brief.goals[0] ||
      "Help visitors understand supplied physiotherapy services and request an appointment",
    targetLocations: brief.location ? [brief.location] : [],
    priorityTopics: [...services, ...conditions],
    audiences: ["people seeking physiotherapy information"],
    languages: brief.languages.length ? [...brief.languages] : ["en"],
    localSeo: Boolean(brief.location),
    servicePages: true,
    locationPages: false,
    blog: false,
  };
  next.pages = physiotherapyDraftPack.pages.map((page) => {
    const pageKey = page.path === "/" ? "home" : page.path.slice(1);
    const planned = page.sections.map((section) => section.family);
    const families =
      page.path === "/"
        ? planned
        : uniqueFamilies(["navbar", ...planned, "footer"]);
    return {
      id: pageKey,
      path: page.path,
      name: page.label,
      sections: families.map((family, index) =>
        sectionFor({
          family,
          pageKey,
          index,
          brief,
          services,
          conditions,
          therapists,
          navigation,
        }),
      ),
      seo: {
        title: truncate(
          page.path === "/"
            ? `${brief.businessName} | Physiotherapy`
            : `${page.label} | ${brief.businessName}`,
          70,
        ),
        description: truncate(pageDescription(page.path, brief), 180),
        canonicalPath: page.path,
        indexable: true,
        structuredDataTypes:
          page.path === "/"
            ? ["MedicalClinic", "LocalBusiness"]
            : ["MedicalClinic", "BreadcrumbList"],
      },
    };
  });
  const hygienic = applyPhysiotherapyDraftContentHygiene(next).site;
  return siteSchema.parse(applyPhysiotherapyDraftMedia(hygienic));
}

function sectionFor(input: {
  family: SectionFamily;
  pageKey: string;
  index: number;
  brief: PhysiotherapyDraftBrief;
  services: string[];
  conditions: string[];
  therapists: VerifiedPhysiotherapyProfile[];
  navigation: Site["navigation"];
}): SiteSection {
  const { family, pageKey, index, brief, services, conditions, therapists } =
    input;
  const common = {
    id: `${pageKey}-${family}-${index + 1}`,
    component: { componentId: `${family}.placeholder`, version: "1.0.0" },
    bindings: {},
    hidden: false,
  };
  switch (family) {
    case "navbar":
      return {
        ...common,
        props: {
          title: brief.businessName,
          items: input.navigation.map((item) => ({
            title: item.label,
            href: item.href,
          })),
          primaryAction: requestAction(),
        },
      };
    case "hero":
      return {
        ...common,
        props: {
          eyebrow: brief.location || "Physiotherapy",
          title: heroTitle(pageKey, brief),
          description: heroDescription(pageKey, brief, services, conditions),
          primaryAction: requestAction(),
          secondaryAction: {
            label: "Explore therapies",
            href: "/therapies",
          },
        },
      };
    case "services": {
      const isConditions = pageKey === "conditions";
      const labels = isConditions ? conditions : services;
      return {
        ...common,
        props: {
          title: isConditions
            ? "Concerns you may want to discuss"
            : "Physiotherapy services",
          description: isConditions
            ? "Browse the concerns listed by the clinic. A physiotherapy assessment is needed for advice about your symptoms."
            : "Explore the clinic’s physiotherapy services and request an assessment to discuss what may suit your needs.",
          items: labels.map((label) => ({
            title: label,
            description: isConditions
              ? `Ask whether a physiotherapy assessment may be appropriate for ${label.toLowerCase()}. This page cannot diagnose symptoms.`
              : `Ask what ${label.toLowerCase()} involves and whether it may suit the reason you are seeking physiotherapy.`,
          })),
        },
        hidden: labels.length === 0,
      };
    }
    case "features": {
      const props = featureContent(pageKey, brief);
      return {
        ...common,
        props,
        hidden: props.items.length === 0,
      };
    }
    case "process":
      return {
        ...common,
        props: {
          title: "What happens next",
          items: [
            {
              title: "Send a request",
              description:
                "Share the contact details and reason for the appointment request that the clinic asks for.",
            },
            {
              title: "Clinic response",
              description:
                "The clinic can respond with availability and any preparation information.",
            },
            {
              title: "Assessment",
              description:
                "A qualified professional can discuss history, goals and appropriate next steps during the appointment.",
            },
          ],
        },
      };
    case "team":
      return {
        ...common,
        props: {
          title: "Physiotherapists",
          description:
            "Get to know the physiotherapists listed by the clinic before requesting an appointment.",
          items: therapists.map((profile) => ({
            title: profile.name.trim(),
            description: [
              profile.role?.trim(),
              ...(profile.credentials ?? []).map((value) => value.trim()),
            ]
              .filter(Boolean)
              .join(" · "),
            verified: true,
          })),
        },
        hidden: therapists.length === 0,
      };
    case "about":
      return {
        ...common,
        props: aboutContent(pageKey, brief),
      };
    case "gallery":
      return {
        ...common,
        props: {
          title: "Clinic facilities and accessibility",
          description:
            "Clinic-supplied facility and accessibility images can be shown here after verification.",
          items: [],
        },
        hidden: true,
      };
    case "contact": {
      const rendersRequestForm = pageKey === "contact";
      return {
        ...common,
        props: {
          title: rendersRequestForm
            ? `Request an appointment with ${brief.businessName}`
            : pageKey === "about"
              ? "Plan your visit"
              : `Visit or contact ${brief.businessName}`,
          description: contactDescription(brief),
          primaryAction: rendersRequestForm
            ? {
                label: "Request appointment",
                href: "#contact-form",
              }
            : requestAction(),
          ...(rendersRequestForm ? { formBindingKey: "appointment" } : {}),
          ...(brief.phone ? { phone: brief.phone } : {}),
          ...(brief.openingHours?.length
            ? { openingHours: [...brief.openingHours] }
            : {}),
        },
        bindings: rendersRequestForm
          ? {
              appointment: {
                actionId: "appointment.request",
                inputMap: {},
              },
            }
          : {},
      };
    }
    case "cta":
      return {
        ...common,
        props: {
          title: "Ready to discuss your next step?",
          description:
            "Send an appointment request. The clinic will respond to confirm availability; submitting the form does not confirm a slot.",
          primaryAction: requestAction(),
        },
        bindings: {
          appointment: { actionId: "appointment.request", inputMap: {} },
        },
      };
    case "footer":
      return {
        ...common,
        props: {
          title: brief.businessName,
          description:
            "Physiotherapy information and appointment requests. Website content is not a diagnosis or a substitute for professional advice.",
          footerLinks: input.navigation,
          copyright: `© ${new Date().getUTCFullYear()} ${brief.businessName}`,
        },
      };
    case "testimonials":
      return {
        ...common,
        props: { title: "Patient feedback", items: [] },
        hidden: true,
      };
  }
}

function featureContent(pageKey: string, brief: PhysiotherapyDraftBrief) {
  if (pageKey === "conditions") {
    return {
      title: "Questions before you request an appointment",
      items: [
        {
          title: "Can this website diagnose my symptoms?",
          description:
            "No. A qualified professional needs appropriate history and assessment information.",
        },
        {
          title: "Is an appointment confirmed after I submit?",
          description: "No. The clinic must respond and confirm availability.",
        },
      ],
    };
  }
  if (pageKey === "therapists") {
    return {
      title: "Questions to ask before an assessment",
      items: [
        {
          title: "Qualifications and registration",
          description:
            "Ask about the qualifications and professional registration of the physiotherapist who may see you.",
        },
        {
          title: "Experience relevant to you",
          description:
            "Ask whether the physiotherapist regularly works with concerns or goals similar to yours.",
        },
        {
          title: "What to expect",
          description:
            "Ask who will carry out the assessment, what to bring and how the clinic decides on the next step.",
        },
      ],
    };
  }
  if (pageKey === "contact") {
    return {
      title: "Contact information",
      items: [
        ...(brief.location
          ? [{ title: "Location", description: brief.location }]
          : []),
        ...(brief.phone ? [{ title: "Phone", description: brief.phone }] : []),
        ...((brief.openingHours ?? []).length
          ? [
              {
                title: "Opening hours",
                description: brief.openingHours!.join(" · "),
              },
            ]
          : []),
      ],
    };
  }
  if (pageKey === "about") {
    return {
      title: "Helpful details before you visit",
      items: [
        {
          title: "Physiotherapy services",
          description:
            "Explore the services listed by the clinic and note anything you would like to discuss during an assessment.",
        },
        {
          title: "Plan your visit",
          description:
            "Check the available location, opening hours and accessibility details, and contact the clinic if you need anything confirmed.",
        },
        {
          title: "Advice begins with an assessment",
          description:
            "This website provides general information; a physiotherapist can discuss your symptoms, goals and possible next steps during an assessment.",
        },
      ],
    };
  }
  return {
    title: "A clear path to your first appointment",
    items: [
      {
        title: "Explore physiotherapy services",
        description:
          "See the services listed by the clinic and note anything you would like to discuss.",
      },
      {
        title: "Request an appointment",
        description:
          "Send your contact details and the clinic will respond to confirm availability.",
      },
      {
        title: "Discuss your goals",
        description:
          "An assessment is the right place to discuss your symptoms, goals and possible next steps.",
      },
    ],
  };
}

function aboutContent(pageKey: string, brief: PhysiotherapyDraftBrief) {
  if (pageKey === "conditions") {
    return {
      title: "When to seek an assessment",
      description:
        "If you want advice about symptoms, function or rehabilitation goals, request an appointment with an appropriately qualified professional. Seek urgent local medical help for an emergency.",
      items: [],
    };
  }
  if (pageKey === "therapies") {
    return {
      title: "Suitability depends on assessment",
      description:
        "A listed therapy is not a recommendation for every visitor. The clinic can explain whether an assessment is appropriate for the reason you contact them.",
      items: [],
    };
  }
  if (pageKey === "contact") {
    return {
      title: "Directions and access",
      description: brief.location
        ? `Confirm directions and accessibility details with the clinic before travelling to ${brief.location}.`
        : "Ask the clinic to confirm directions and accessibility details before travelling.",
      items: [],
    };
  }
  if (pageKey === "therapists") {
    return {
      title: "Preparing for an assessment",
      description:
        "When you contact the clinic, share the main reason for your request and ask whether you should bring reports, scans or referral details.",
      items: [],
    };
  }
  return {
    title: "Clinic information before your visit",
    description:
      "Learn about the clinic’s listed services and how to request an appointment. Contact the clinic directly to confirm accessibility or other visit requirements.",
    items: [],
  };
}

function heroTitle(pageKey: string, brief: PhysiotherapyDraftBrief) {
  const hasVerifiedTherapists = (brief.therapists ?? []).some(
    (profile) => profile.verified && profile.name.trim(),
  );
  const titles: Record<string, string> = {
    home: "A clearer first step for movement and rehabilitation",
    therapies: "Explore physiotherapy services",
    conditions: "Understand when to request an assessment",
    therapists: hasVerifiedTherapists
      ? "Meet the physiotherapy team"
      : "Choosing a physiotherapist",
    about: `About ${brief.businessName}`,
    contact: "Request an appointment",
  };
  return truncate(titles[pageKey] ?? brief.businessName, 72);
}

function heroDescription(
  pageKey: string,
  brief: PhysiotherapyDraftBrief,
  services: string[],
  conditions: string[],
) {
  if (pageKey === "home") {
    const supplied = services.slice(0, 3).join(", ");
    return supplied
      ? `Explore ${supplied} and request an appointment${brief.location ? ` in ${brief.location}` : ""}. The clinic will confirm availability.`
      : `Explore the clinic’s supplied physiotherapy information and request an appointment. The clinic will confirm availability.`;
  }
  if (pageKey === "therapies")
    return "Explore the clinic’s physiotherapy services and request an assessment to discuss your needs.";
  if (pageKey === "conditions")
    return conditions.length
      ? "Browse concerns you may want to discuss without self-diagnosing. A professional assessment is needed for individual advice."
      : "Browse general information before contacting the clinic. This page cannot diagnose symptoms.";
  if (pageKey === "therapists")
    return (brief.therapists ?? []).some(
      (profile) => profile.verified && profile.name.trim(),
    )
      ? "Learn about the physiotherapists listed by the clinic before making an appointment request."
      : "Practitioner profiles are not available on this site yet. Ask the clinic about qualifications, relevant experience and who may be best placed to assess your needs.";
  if (pageKey === "about")
    return "Learn about the clinic’s listed services and practical details before you get in touch.";
  return contactDescription(brief);
}

function pageDescription(path: string, brief: PhysiotherapyDraftBrief) {
  const location = brief.location ? ` in ${brief.location}` : "";
  const descriptions: Record<string, string> = {
    "/": `${brief.businessName} physiotherapy information${location} and a clear way to request an appointment.`,
    "/therapies": `Explore physiotherapy services listed by ${brief.businessName}.`,
    "/conditions": `Browse concerns you may want to discuss without diagnosis or recovery promises.`,
    "/therapists": `Learn about the physiotherapists listed by ${brief.businessName} and questions to ask before an assessment.`,
    "/about": `Learn about ${brief.businessName}, its listed services and practical visit details.`,
    "/contact": `Request an appointment with ${brief.businessName}; the clinic will confirm availability.`,
  };
  return descriptions[path] ?? descriptions["/"]!;
}

function contactDescription(brief: PhysiotherapyDraftBrief) {
  return brief.location
    ? `Send an appointment request to the clinic in ${brief.location}. The clinic will respond to confirm availability.`
    : "Send an appointment request and the clinic will respond to confirm availability.";
}

function requestAction() {
  return { label: "Request appointment", href: "/contact" };
}

function uniqueFamilies(families: SectionFamily[]): SectionFamily[] {
  return families.filter((family, index) => families.indexOf(family) === index);
}

function uniquePublicLabels(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.flatMap((value) => {
    const label = value.trim();
    const key = label.toLocaleLowerCase("en-US");
    if (!label || seen.has(key)) return [];
    seen.add(key);
    return [label];
  });
}

function truncate(value: string, maximum: number) {
  if (value.length <= maximum) return value;
  return `${value.slice(0, Math.max(0, maximum - 1)).trimEnd()}…`;
}
