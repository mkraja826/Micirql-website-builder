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

export type DentalBrief = {
  businessName: string;
  location?: string | null;
  services: string[];
  goals: string[];
  languages: string[];
  notes?: string | null;
};

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

export function createDentalStructuralScaffold(
  source: Site,
  brief: DentalBrief,
  brandInput?: BrandInput,
  brandProvenance?: BrandProvenance,
): Site {
  const next = structuredClone(source);
  const pack = getDomainPack("clinic");
  const navigation = pack.defaultPages
    .filter((page) => page.required)
    .map((page) => ({
      label: page.label
        .replace("Treatments / ", "")
        .replace(" / Appointment", ""),
      href: page.slug,
    }));

  next.name = brief.businessName;
  next.domain = "clinic";
  next.subtype = "dental";
  next.navigation = navigation;
  next.theme = applyBrandInput(next.theme, brandInput, brandProvenance);
  next.seoBlueprint = {
    ...next.seoBlueprint,
    primaryGoal:
      brief.goals[0] ||
      "Help patients understand services and request an appointment",
    targetLocations: brief.location ? [brief.location] : [],
    priorityTopics: [...brief.services],
    languages: brief.languages.length ? [...brief.languages] : ["en"],
    localSeo: Boolean(brief.location),
    servicePages: true,
  };
  next.pages = pack.defaultPages
    .filter((page) => page.required)
    .map((page) => {
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
              "footer",
            ] as SectionFamily[]);
      return {
        id: pageKey,
        path: page.slug,
        name: page.label,
        sections: families.map((family, index) =>
          sectionFor(family, pageKey, index, brief, navigation),
        ),
        seo: {
          title: truncate(
            page.slug === "/"
              ? brief.businessName + " | Dental clinic"
              : page.label + " | " + brief.businessName,
            70,
          ),
          description: truncate(pageDescription(page.slug, brief), 180),
          canonicalPath: page.slug,
          indexable: true,
          structuredDataTypes:
            page.slug === "/"
              ? ["Dentist", "LocalBusiness"]
              : ["Dentist", "BreadcrumbList"],
        },
      };
    });
  return siteSchema.parse(next);
}

function sectionFor(
  family: SectionFamily,
  pageKey: string,
  index: number,
  brief: DentalBrief,
  navigation: Site["navigation"],
): SiteSection {
  const id = pageKey + "-" + family + "-" + (index + 1);
  const location = brief.location ? " in " + brief.location : "";
  const firstService = brief.services[0] || "dental care";
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
          title:
            pageKey === "home"
              ? brief.businessName + ": " + title(firstService) + location
              : pageHeading(pageKey, brief),
          description: pageDescription(
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
          description:
            brief.notes ||
            "Use this section for verified information about the clinic, its approach and its location.",
          items: [],
        },
      };
    case "services":
      return {
        ...common,
        props: {
          title: "Dental services",
          description:
            "Explore the treatments supplied in the business brief. Contact the clinic for information relevant to your needs.",
          items: brief.services.map((service) => ({
            title: title(service),
            description:
              "Ask " +
              brief.businessName +
              " for verified information about " +
              service +
              ", suitability and next steps.",
          })),
        },
      };
    case "features":
      return {
        ...common,
        props: {
          title: "Plan your visit with clear information",
          items: [
            {
              title: "Review services",
              description: "Start with the treatments listed by the clinic.",
            },
            {
              title: "Share your needs",
              description:
                "Send an enquiry without implying confirmed availability.",
            },
            {
              title: "Confirm next steps",
              description:
                "The clinic can respond with information relevant to your request.",
            },
          ],
        },
      };
    case "process":
      return {
        ...common,
        props: {
          title: "Requesting an appointment",
          items: [
            {
              title: "Choose a service",
              description: "Review the available treatment information.",
            },
            {
              title: "Send a request",
              description:
                "Provide a contact method and your preferred next step.",
            },
            {
              title: "Await confirmation",
              description:
                "An appointment is not confirmed until the clinic responds.",
            },
          ],
        },
      };
    case "testimonials":
      return {
        ...common,
        props: {
          title: "Patient feedback",
          description:
            "Verified reviews supplied or approved by the clinic can be added here.",
          items: [],
        },
      };
    case "gallery":
      return {
        ...common,
        props: {
          title: "Clinic gallery",
          description:
            "Approved clinic-owned or accurately licensed images can be added here.",
          items: [],
        },
      };
    case "team":
      return {
        ...common,
        props: {
          title: "Dental team",
          description:
            "Add only verified clinician names, roles, biographies and credentials.",
          items: [],
        },
      };
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
            ? "Send an enquiry to the clinic in " + brief.location + "."
            : "Send an enquiry and the clinic can respond with the appropriate next step.",
          primaryAction: { label: "Send enquiry", href: "#contact-form" },
        },
        bindings: { submit: { actionId: "lead.create", inputMap: {} } },
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
    return (
      "Meet verified clinicians at " +
      brief.businessName +
      " once the clinic supplies their names, roles and credentials."
    );
  if (path === "/about")
    return (
      "Learn about " +
      brief.businessName +
      " using information supplied and approved by the clinic."
    );
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
