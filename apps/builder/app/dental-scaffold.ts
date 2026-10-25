import { getDomainPack } from "@micirql/domains";
import {
  siteSchema,
  type BrandInput,
  type BrandProvenance,
  type Site,
  type SiteSection,
} from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";
import { applyBrandInput } from "./brand-provenance";
import { demoAssetById } from "./demo-assets";
import { applyDentalVisitorContentHygiene } from "./dental-content-hygiene";
import { dentalServiceDescription } from "./dental-service-content";
import { normalizeServiceInput } from "./service-normalization";

export type DentalBrief = {
  businessName: string;
  location?: string | null;
  services: string[];
  goals: string[];
  languages: string[];
  notes?: string | null;
  clinicians?: DentalClinician[];
};

export type DentalClinician = {
  name: string;
  role: string;
  credentials?: string;
  biography?: string;
};

export const DENTAL_HERO_COPY_LIMITS = {
  title: 52,
  description: 150,
  serviceHighlights: 3,
} as const;

const HOME_FAMILIES: SectionFamily[] = [
  "navbar",
  "hero",
  "about",
  "services",
  "features",
  "process",
  "testimonials",
  "gallery",
  "team",
  "cta",
  "contact",
  "footer",
];

const PAGE_FAMILY_ADDITIONS: Partial<Record<string, SectionFamily[]>> = {
  services: ["process"],
  doctors: ["features", "process"],
  about: ["process", "cta"],
  contact: ["features"],
};

export function createDentalStructuralScaffold(
  source: Site,
  brief: DentalBrief,
  brandInput?: BrandInput,
  brandProvenance?: BrandProvenance,
): Site {
  const next = structuredClone(source);
  const clinicians = normalizeDentalClinicians(brief.clinicians);
  const normalizedBrief = {
    ...brief,
    clinicians,
    services: normalizeServiceInput(brief.services, {
      industry: "Dental clinic",
      subindustry: "dental",
    }),
  };
  const pack = getDomainPack("clinic");
  const includedPages = pack.defaultPages.filter(
    (page) =>
      page.required && (page.slug !== "/doctors" || clinicians.length > 0),
  );
  const navigation = includedPages.map((page) => ({
    label: page.label
      .replace("Treatments / ", "")
      .replace(" / Appointment", ""),
    href: page.slug,
  }));

  next.name = normalizedBrief.businessName;
  next.domain = "clinic";
  next.subtype = "dental";
  next.navigation = navigation;
  next.theme = applyBrandInput(next.theme, brandInput, brandProvenance);
  next.seoBlueprint = {
    ...next.seoBlueprint,
    primaryGoal:
      normalizedBrief.goals[0] ||
      "Help patients understand services and request an appointment",
    targetLocations: normalizedBrief.location ? [normalizedBrief.location] : [],
    priorityTopics: [...normalizedBrief.services],
    languages: normalizedBrief.languages.length
      ? [...normalizedBrief.languages]
      : ["en"],
    localSeo: Boolean(normalizedBrief.location),
    servicePages: true,
  };
  next.pages = includedPages.map((page) => {
    const pageKey =
      page.slug === "/"
        ? "home"
        : page.slug.slice(1).replace(/[^a-z0-9]+/g, "-");
    const families =
      page.slug === "/"
        ? HOME_FAMILIES
        : uniqueFamilies([
            "navbar",
            ...page.sectionFamilies,
            ...(PAGE_FAMILY_ADDITIONS[pageKey] ?? []),
            "footer",
          ] as SectionFamily[]);
    return {
      id: pageKey,
      path: page.slug,
      name: page.label,
      sections: families.map((family, index) =>
        sectionFor(family, pageKey, index, normalizedBrief, navigation),
      ),
      seo: {
        title: truncate(
          page.slug === "/"
            ? normalizedBrief.businessName + " | Dental clinic"
            : page.label + " | " + normalizedBrief.businessName,
          70,
        ),
        description: truncate(pageDescription(page.slug, normalizedBrief), 180),
        canonicalPath: page.slug,
        indexable: true,
        structuredDataTypes:
          page.slug === "/"
            ? ["Dentist", "LocalBusiness"]
            : ["Dentist", "BreadcrumbList"],
      },
    };
  });
  return applyDentalVisitorContentHygiene(siteSchema.parse(next)).site;
}

function sectionFor(
  family: SectionFamily,
  pageKey: string,
  index: number,
  brief: DentalBrief,
  navigation: Site["navigation"],
): SiteSection {
  const id = pageKey + "-" + family + "-" + (index + 1);
  const common = {
    id,
    component: { componentId: family + ".placeholder", version: "1.0.0" },
    bindings: {},
    hidden: false,
  };
  switch (family) {
    case "navbar":
      return {
        ...common,
        props: {
          title: brief.businessName,
          items: navigation.map((item) => ({
            title: item.label,
            href: item.href,
          })),
          primaryAction: { label: "Request appointment", href: "/contact" },
        },
      };
    case "hero":
      return {
        ...common,
        props: {
          eyebrow: brief.location || "Dental care",
          title: heroTitle(pageKey, brief),
          description: heroDescription(
            "/" + (pageKey === "home" ? "" : pageKey),
            brief,
          ),
          primaryAction: { label: "Request appointment", href: "/contact" },
          secondaryAction: { label: "Explore treatments", href: "/services" },
          image: dentalScaffoldHero(),
        },
      };
    case "about":
      return {
        ...common,
        props: {
          title: "About " + brief.businessName,
          description: safeAboutDescription(brief),
          items: aboutItems(brief),
        },
      };
    case "services":
      return {
        ...common,
        props: {
          title: "Dental services",
          description:
            "Understand the treatments listed by the clinic, the questions to ask, and the next step to confirm before making a care decision.",
          items: brief.services.map((service) => ({
            title: title(service),
            description: dentalServiceDescription(service, {
              businessName: brief.businessName,
            }),
          })),
        },
      };
    case "features":
      return {
        ...common,
        props: featureContent(pageKey, brief),
      };
    case "process":
      return {
        ...common,
        props: processContent(pageKey, brief),
      };
    case "testimonials":
      return {
        ...common,
        props: { title: "Patient feedback", items: [] },
        hidden: true,
      };
    case "gallery":
      return {
        ...common,
        props: { title: "Clinic gallery", items: [] },
        hidden: true,
      };
    case "team": {
      const clinicians = normalizeDentalClinicians(brief.clinicians);
      return {
        ...common,
        props: {
          title: "Dental team",
          description:
            "Meet the clinicians whose names, roles and credentials were supplied by the clinic.",
          items: clinicians.map((clinician) => ({
            name: clinician.name,
            title: clinician.name,
            eyebrow: clinician.role,
            description: [
              clinician.role,
              clinician.credentials,
              clinician.biography,
            ]
              .filter(Boolean)
              .join(" · "),
          })),
        },
        hidden: clinicians.length === 0,
      };
    }
    case "cta":
      return {
        ...common,
        props: {
          title: "Ready to ask about your next step?",
          description:
            "Send an appointment request to " +
            brief.businessName +
            ". The clinic will confirm availability.",
          primaryAction: { label: "Request appointment", href: "/contact" },
        },
        bindings: {
          appointment: { actionId: "appointment.request", inputMap: {} },
        },
      };
    case "contact":
      return {
        ...common,
        props: {
          title: "Contact " + brief.businessName,
          description: brief.location
            ? "Request an appointment with the clinic in " +
              brief.location +
              ". The clinic will confirm availability."
            : "Request an appointment and the clinic will confirm availability.",
          primaryAction: {
            label: "Request appointment",
            href: "#contact-form",
          },
          formBindingKey: "appointment",
        },
        bindings: {
          appointment: { actionId: "appointment.request", inputMap: {} },
          submit: { actionId: "lead.create", inputMap: {} },
        },
      };
    case "footer":
      return {
        ...common,
        props: {
          title: brief.businessName,
          description: "Dental information and appointment requests.",
          footerLinks: navigation,
          copyright:
            "© " + new Date().getUTCFullYear() + " " + brief.businessName,
        },
      };
  }
}

function dentalScaffoldHero() {
  const asset = demoAssetById("mi-dental-calm-clinic");
  if (!asset) {
    throw new Error("The certified dental scaffold hero asset is unavailable.");
  }
  return {
    assetId: asset.id,
    src: asset.originalUrl,
    alt: asset.alt,
    focalPoint: asset.focalPoint,
    license: asset.license,
    ...(asset.sourceReference
      ? { sourceReference: asset.sourceReference }
      : {}),
  };
}

function pageHeading(pageKey: string, brief: DentalBrief) {
  const headings: Record<string, string> = {
    services: "Explore dental services",
    doctors: "Meet the dental team",
    about: "About " + brief.businessName,
    contact: "Request an appointment",
  };
  return headings[pageKey] ?? brief.businessName;
}

function heroTitle(pageKey: string, brief: DentalBrief): string {
  if (pageKey !== "home") {
    const pageTitle = pageHeading(pageKey, brief);
    if (fits(pageTitle, DENTAL_HERO_COPY_LIMITS.title)) return pageTitle;
    const fallback =
      pageKey === "about"
        ? "About the clinic"
        : pageKey === "contact"
          ? "Request an appointment"
          : pageKey === "doctors"
            ? "Meet the dental team"
            : "Explore dental services";
    return fallback;
  }

  const businessName = cleanDisplayText(brief.businessName);
  const candidates = [
    businessName,
    brief.location
      ? "Dental care in " + cleanDisplayText(brief.location)
      : "Dental care",
    "Dental care",
  ];
  return (
    candidates.find(
      (candidate) =>
        candidate && fits(candidate, DENTAL_HERO_COPY_LIMITS.title),
    ) ?? "Dental care"
  );
}

function heroDescription(path: string, brief: DentalBrief): string {
  if (path === "/" || path === "/services") {
    const closing =
      path === "/"
        ? "Request an appointment to discuss next steps."
        : "Contact the clinic for verified information.";
    return compactServiceDescription(brief.services, closing);
  }

  const description = pageDescription(path, brief);
  if (fits(description, DENTAL_HERO_COPY_LIMITS.description)) {
    return description;
  }
  if (path === "/doctors") {
    return `Contact ${brief.businessName} for current information about clinicians, services and appointment requests.`;
  }
  if (path === "/about") {
    return safeAboutDescription(brief);
  }
  if (path === "/contact") {
    return "Send an enquiry or appointment request. The clinic confirms availability.";
  }
  return "Explore verified clinic information and contact the clinic for the next step.";
}

function compactServiceDescription(
  services: string[],
  closing: string,
): string {
  const highlights: string[] = [];
  for (const service of services) {
    if (highlights.length >= DENTAL_HERO_COPY_LIMITS.serviceHighlights) break;
    const normalized = title(cleanDisplayText(service));
    if (!normalized) continue;
    const candidate = serviceDescription([...highlights, normalized], closing);
    if (!fits(candidate, DENTAL_HERO_COPY_LIMITS.description)) break;
    highlights.push(normalized);
  }
  const description = serviceDescription(highlights, closing);
  if (fits(description, DENTAL_HERO_COPY_LIMITS.description)) {
    return description;
  }
  return "Explore dental services. Request an appointment for the next step.";
}

function serviceDescription(services: string[], closing: string): string {
  const subject = services.length ? naturalList(services) : "dental services";
  return "Explore " + subject + ". " + closing;
}

function naturalList(values: string[]): string {
  if (values.length < 2) return values[0] ?? "";
  if (values.length === 2) return values[0] + " and " + values[1];
  return values.slice(0, -1).join(", ") + ", and " + values[values.length - 1];
}

function cleanDisplayText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function fits(value: string, maximum: number): boolean {
  return value.length <= maximum;
}

function pageDescription(path: string, brief: DentalBrief) {
  const serviceText = brief.services.length
    ? brief.services.join(", ")
    : "dental services";
  if (path === "/services")
    return (
      "Explore " +
      serviceText +
      " and contact " +
      brief.businessName +
      " for verified information relevant to your needs."
    );
  if (path === "/doctors")
    return `Contact ${brief.businessName} for current information about clinicians, dental services and appointment requests.`;
  if (path === "/about") return safeAboutDescription(brief);
  if (path === "/contact")
    return (
      "Send an enquiry or appointment request to " +
      brief.businessName +
      ". Availability is confirmed by the clinic."
    );
  return (
    "Explore " +
    serviceText +
    (brief.location ? " in " + brief.location : "") +
    " and request an appointment with " +
    brief.businessName +
    "."
  );
}

function uniqueFamilies(families: SectionFamily[]) {
  return families.filter((family, index) => families.indexOf(family) === index);
}

function normalizeDentalClinicians(
  clinicians: DentalBrief["clinicians"],
): DentalClinician[] {
  if (!Array.isArray(clinicians)) return [];
  return clinicians.flatMap((clinician) => {
    if (!clinician || typeof clinician !== "object") return [];
    const name = cleanDisplayText(clinician.name);
    const role = cleanDisplayText(clinician.role);
    if (!name || !role) return [];
    const credentials = clinician.credentials
      ? cleanDisplayText(clinician.credentials)
      : undefined;
    const biography = clinician.biography
      ? cleanDisplayText(clinician.biography)
      : undefined;
    return [
      {
        name,
        role,
        ...(credentials ? { credentials } : {}),
        ...(biography ? { biography } : {}),
      },
    ];
  });
}

function safeAboutDescription(brief: DentalBrief) {
  const services = brief.services.slice(0, 3).map((service) => title(service));
  const subject = services.length ? naturalList(services) : "Dental services";
  return (
    brief.businessName +
    (brief.location
      ? " serves people looking for dental care in " + brief.location
      : " provides dental care information") +
    ". Explore " +
    subject +
    ", prepare questions for the clinic, and request an appointment when you are ready to discuss the next step."
  );
}

function aboutItems(brief: DentalBrief) {
  return [
    {
      title: "Treatments in one place",
      description: brief.services.length
        ? `Review ${naturalList(brief.services.slice(0, 3).map(title))} and the other services supplied in the clinic brief.`
        : "Review the dental services supplied in the clinic brief.",
    },
    {
      title: "Questions before decisions",
      description:
        "Use each service overview to identify what you want to ask about assessment, suitability and next steps.",
    },
    {
      title: "A clear appointment request",
      description:
        "Share the service you are interested in and a reliable contact method; the clinic confirms availability separately.",
    },
  ];
}

function featureContent(pageKey: string, brief: DentalBrief) {
  if (pageKey === "doctors") {
    return {
      title: "Prepare for a clinician conversation",
      description:
        "The clinic should confirm who will provide care and which clinician is appropriate for your request.",
      items: [
        {
          title: "Ask who will provide care",
          description:
            "Request current clinician names, roles and qualifications directly from the clinic before your visit.",
        },
        {
          title: "Share relevant context",
          description:
            "Mention the service you are considering and any information the clinic should know when reviewing your request.",
        },
        {
          title: "Confirm the next step",
          description:
            "Ask whether an assessment is needed and what the clinic wants you to bring or prepare.",
        },
      ],
    };
  }
  if (pageKey === "contact") {
    return {
      title: "Prepare a useful appointment request",
      description:
        "A few clear details help the clinic understand why you are getting in touch.",
      items: [
        {
          title: "Name the service",
          description:
            "Mention the treatment or dental concern you want to discuss without sharing unnecessary sensitive information.",
        },
        {
          title: "Choose a contact method",
          description:
            "Provide an email address and, if useful, a phone number where the clinic can respond.",
        },
        {
          title: "Wait for confirmation",
          description:
            "Submitting the form sends a request; an appointment is confirmed only when the clinic responds.",
        },
      ],
    };
  }
  if (pageKey === "services") {
    return {
      title: "Compare treatments with the right questions",
      description:
        "Service information is a starting point; a dental professional determines what is relevant after assessment.",
      items: [
        {
          title: "Purpose",
          description:
            "Understand what the treatment is commonly used to address and which alternatives may be discussed.",
        },
        {
          title: "Suitability",
          description:
            "Ask what examination or records may be needed before a recommendation can be made.",
        },
        {
          title: "Aftercare and follow-up",
          description:
            "Confirm the expected care instructions, follow-up approach and questions to raise before proceeding.",
        },
      ],
    };
  }
  return {
    title: "Plan your visit with clear information",
    description: brief.location
      ? `Explore the clinic brief for ${brief.location}, then send a focused request when you are ready.`
      : "Explore the clinic brief, then send a focused request when you are ready.",
    items: [
      {
        title: "Review services",
        description:
          "Start with the listed treatments and note the questions that matter to your decision.",
      },
      {
        title: "Share your needs",
        description:
          "Tell the clinic which service you want to discuss and how you would like them to respond.",
      },
      {
        title: "Confirm next steps",
        description:
          "The clinic can explain whether an assessment is needed and confirm appointment availability.",
      },
    ],
  };
}

function processContent(pageKey: string, brief: DentalBrief) {
  const titles =
    pageKey === "services"
      ? [
          "Explore the overview",
          "Prepare your questions",
          "Request an assessment",
        ]
      : pageKey === "doctors"
        ? ["Send your request", "Confirm the clinician", "Confirm the visit"]
        : ["Choose a service", "Send a request", "Await confirmation"];
  return {
    title:
      pageKey === "services"
        ? "From service research to a clinic conversation"
        : pageKey === "doctors"
          ? "How clinician information is confirmed"
          : "Requesting an appointment",
    description:
      "The website starts the conversation; the clinic provides individual information and confirms availability.",
    items: titles.map((itemTitle, index) => ({
      title: itemTitle,
      description:
        index === 0
          ? `Review the information from ${brief.businessName} and identify the service or question you want to discuss.`
          : index === 1
            ? "Share a reliable contact method and ask for the current information relevant to your request."
            : "Wait for the clinic to respond before treating the request as a confirmed appointment.",
    })),
  };
}

function title(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function truncate(value: string, maximum: number) {
  return value.length <= maximum
    ? value
    : value.slice(0, maximum - 1).trimEnd() + "…";
}
