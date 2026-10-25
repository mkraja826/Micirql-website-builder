import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  SCHEMA_VERSION,
  siteSchema,
  type Site,
  type SiteSection,
} from "@micirql/schema";
import {
  CERTIFIED_SECTION_COMPONENT_VERSION,
  isCertifiedSectionComponent,
  type SectionFamily,
} from "@micirql/sections";
import { INDUSTRY_AVAILABILITY } from "../apps/builder/app/industry-availability";
import {
  RESTAURANT_DRAFT_MEDIA_IDS,
  RESTAURANT_DRAFT_PAGE_PATHS,
  RESTAURANT_RESERVATION_COMPLETION_STATE,
  applyRestaurantDraftContentHygiene,
  applyRestaurantDraftMedia,
  createRestaurantDraftScaffold,
  restaurantDraftContentIssues,
  restaurantDraftMediaIssues,
  restaurantDraftPack,
  type RestaurantDraftBrief,
} from "../apps/builder/app/industry-packs/drafts";
import {
  listCertifiedIndustryPacks,
  resolveCertifiedIndustryPack,
  resolveCertifiedIndustryPackByCatalogVersion,
  resolveCertifiedIndustryPackById,
  resolveCertifiedIndustryPackForSite,
} from "../apps/builder/app/industry-packs";
import { buildStaticProject } from "../apps/builder/app/api/publish/export-utils";

const LOGO_ASSET_ID = "qa-only/Restaurant-Logo_CASE-sensitive_01";
const BRAND_INPUT = { logoAssetId: LOGO_ASSET_ID, colors: {} };
const BRAND_PROVENANCE = {
  logo: "user-upload" as const,
  colors: {},
};

const REFERENCE_BRIEF: RestaurantDraftBrief = {
  businessName: "Saffron Courtyard",
  cuisines: ["Deccani", "Regional Indian"],
  serviceModes: ["Dine-in"],
  menu: {
    suppliedAsCurrent: true,
    categories: [
      {
        name: "Small plates",
        description: "Items supplied by the restaurant.",
        items: [
          {
            name: "Charred corn chaat",
            description: "Corn, lime and house spice.",
            price: "320",
            currency: "INR",
            disclosures: ["Contains dairy"],
          },
          {
            name: "Pepper chicken",
            description: "Chicken with black pepper and curry leaf.",
            price: "480",
            currency: "INR",
          },
        ],
      },
      {
        name: "Rice and mains",
        items: [
          {
            name: "Vegetable biryani",
            description: "Basmati rice and seasonal vegetables.",
            price: "540",
            currency: "INR",
            disclosures: ["Vegetarian"],
          },
        ],
      },
    ],
    notes: ["Menu and prices supplied on 24 October 2026."],
    disclosureNotes: [
      "Please tell the restaurant about allergies before ordering.",
    ],
  },
  address: "12 Garden Road, Hyderabad, Telangana",
  mapUrl: "https://maps.example.test/saffron-courtyard",
  directions: ["Entrance is beside the garden gate."],
  openingHours: ["Monday–Sunday, 12:00 PM–10:30 PM"],
  accessibility: ["Step-free entrance supplied by the restaurant."],
  parking: ["Street parking details supplied by the restaurant."],
  transit: ["Garden Road bus stop is 200 metres away."],
  visitDetails: ["Indoor and courtyard seating are available."],
  phone: "+91 40 5555 0182",
  email: "hello@saffron.example",
  reservationPolicy: ["Table requests are reviewed by the restaurant."],
  partyDetails: ["For groups above eight, include the party size."],
  specialRequestNotes: [
    "Add seating or accessibility requests to the message.",
  ],
  story: {
    heading: "A neighbourhood table",
    paragraphs: [
      "Saffron Courtyard began as a small dining room beside the garden.",
    ],
    principles: ["Seasonal menu updates supplied by the restaurant"],
    people: [
      {
        name: "Radhika Rao",
        role: "Host",
        biography: "Profile supplied and verified by the restaurant.",
        verified: true,
      },
    ],
  },
  goals: ["Help guests read the menu and request a table"],
  languages: ["en"],
};

test.describe("Restaurant factual reference scaffold", () => {
  test("builds six concrete, Restaurant-only routes and preserves the exact supplied logo ID", () => {
    const site = referenceSite();

    expect(site.domain).toBe("restaurant");
    expect(site.subtype).toBe("restaurant");
    expect(site.pages.map((page) => page.path)).toEqual(
      RESTAURANT_DRAFT_PAGE_PATHS,
    );
    expect(site.navigation).toEqual(
      restaurantDraftPack.pages.map((page) => ({
        label: page.label,
        href: page.path,
      })),
    );
    expect(site.theme.family).toBe("editorial");
    expect(site.theme.brand.logoAssetId).toBe(LOGO_ASSET_ID);
    expect(site.theme.brand.typography.display).toContain("Source Serif 4");

    const sections = site.pages.flatMap((page) => page.sections);
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(section.component.componentId).not.toContain("placeholder");
      expect(section.component.version).toBe(
        CERTIFIED_SECTION_COMPONENT_VERSION,
      );
      expect(
        isCertifiedSectionComponent(
          section.component.componentId,
          section.component.version,
        ),
        `${section.id} must resolve through the concrete section protocol`,
      ).toBe(true);
    }

    const canonicalBrandPlacements = sections.filter((section) =>
      ["navbar", "footer"].includes(sectionFamily(section)),
    );
    expect(canonicalBrandPlacements).toHaveLength(site.pages.length * 2);
    expect(
      canonicalBrandPlacements.every(
        (section) => !("brandMark" in section.props),
      ),
    ).toBe(true);

    const publicCopy = site.pages
      .flatMap((page) => page.sections)
      .filter((section) => !section.hidden)
      .map((section) => JSON.stringify(section.props))
      .join(" ");
    expect(publicCopy).not.toMatch(
      /dental|dentist|orthodont|root canal|physio|physical therapy|patient|treatment|appointment/i,
    );
    expect(restaurantDraftContentIssues(site)).toEqual([]);
  });

  test("keeps supplied menu groups, prices and currency visible in the scaffold and live renderer", () => {
    const site = referenceSite();
    const menu = sectionOn(site, "/menu", "services");
    const items = menu.props.items as Array<Record<string, unknown>>;

    expect(menu.hidden).toBe(false);
    expect(
      items.map(({ title, group, meta, verified }) => ({
        title,
        group,
        meta,
        verified,
      })),
    ).toEqual([
      {
        title: "Charred corn chaat",
        group: "Small plates",
        meta: "INR 320",
        verified: true,
      },
      {
        title: "Pepper chicken",
        group: "Small plates",
        meta: "INR 480",
        verified: true,
      },
      {
        title: "Vegetable biryani",
        group: "Rice and mains",
        meta: "INR 540",
        verified: true,
      },
    ]);
    expect(menu.props.menuCategories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Small plates",
          items: expect.arrayContaining([
            expect.objectContaining({
              name: "Charred corn chaat",
              price: "320",
              currency: "INR",
            }),
          ]),
        }),
      ]),
    );

    const liveRenderer = readFileSync(
      "packages/sections/src/sections.tsx",
      "utf8",
    );
    expect(liveRenderer).toMatch(/meta\?: string/);
    expect(liveRenderer).toContain('className="mi-section__card-meta"');
    expect(liveRenderer).toContain("items.${index}.meta");
  });

  test("separates general enquiries from one truthful reservation-request binding", () => {
    const site = referenceSite();
    const formSections = site.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        typeof section.props.formBindingKey === "string"
          ? [{ path: page.path, section }]
          : [],
      ),
    );

    expect(formSections).toHaveLength(2);
    expect(
      formSections.map(({ path, section }) => ({
        path,
        key: section.props.formBindingKey,
        label: section.props.formSubmitLabel,
        actionIds: Object.values(section.bindings).map(
          (binding) => binding.actionId,
        ),
      })),
    ).toEqual([
      {
        path: "/reservations",
        key: "reservation",
        label: "Request a table",
        actionIds: ["reservation.request"],
      },
      {
        path: "/contact",
        key: "enquiry",
        label: "Send enquiry",
        actionIds: ["lead.create"],
      },
    ]);

    const reservation = formSections[0]!.section;
    expect(reservation.props.completionState).toBe(
      RESTAURANT_RESERVATION_COMPLETION_STATE,
    );
    expect(String(reservation.props.receiptMessage)).toMatch(
      /not confirmed until the restaurant responds/i,
    );

    const liveRenderer = readFileSync(
      "packages/sections/src/sections.tsx",
      "utf8",
    );
    expect(liveRenderer).toContain(
      'if (actionId === "reservation.request") return "Request a table";',
    );
    expect(liveRenderer).toContain('name="requestedDate"');
    expect(liveRenderer).toContain('name="requestedTime"');
    expect(liveRenderer).toContain('name="partySize"');
    expect(liveRenderer).not.toContain('return "Request reservation"');
  });

  test("selects 16 audited draft images without presenting stock as merchant evidence", () => {
    const site = applyRestaurantDraftMedia(referenceSite(), 7);
    const visibleReferences = site.pages.flatMap((page) =>
      page.sections.flatMap((section) =>
        section.hidden
          ? []
          : imageReferences(section.props).map((image) => ({
              ...image,
              path: page.path,
              family: sectionFamily(section),
              props: section.props,
            })),
      ),
    );
    const heroes = site.pages.map((page) => ({
      path: page.path,
      image: imageReferences(sectionOn(site, page.path, "hero").props)[0],
    }));
    const heroIds = new Set(heroes.map(({ image }) => image?.assetId));
    const supportIds = new Set(
      visibleReferences
        .filter(({ family }) => family !== "hero")
        .map(({ assetId }) => assetId),
    );

    expect(restaurantDraftMediaIssues(site)).toEqual([]);
    expect(restaurantDraftContentIssues(site)).toEqual([]);
    const auditedIds = new Set(RESTAURANT_DRAFT_MEDIA_IDS);
    expect(auditedIds.size).toBeGreaterThanOrEqual(20);
    expect(
      visibleReferences.every(({ assetId }) => auditedIds.has(assetId)),
    ).toBe(true);
    expect(visibleReferences).toHaveLength(16);
    expect(visibleReferences.filter(({ path }) => path === "/")).toHaveLength(
      6,
    );
    expect(heroes).toHaveLength(RESTAURANT_DRAFT_PAGE_PATHS.length);
    expect(heroIds.size).toBe(RESTAURANT_DRAFT_PAGE_PATHS.length);
    expect([...heroIds].filter((assetId) => supportIds.has(assetId!))).toEqual(
      [],
    );

    for (const page of site.pages) {
      const ids = visibleReferences
        .filter((reference) => reference.path === page.path)
        .map((reference) => reference.assetId);
      expect(new Set(ids).size, `${page.path} must not repeat media`).toBe(
        ids.length,
      );
    }
    for (const reference of visibleReferences) {
      expect(["services", "team", "testimonials"]).not.toContain(
        reference.family,
      );
      expect(reference.alt).toMatch(/illustrative/i);
      expect(reference.alt).toMatch(/not a verified/i);
      expect(JSON.stringify(reference.props)).toMatch(/not a verified/i);
    }
  });

  test("removes unsafe mutations, preserves supplied facts, and is idempotent", () => {
    const unsafe = referenceSite();
    const hero = sectionOn(unsafe, "/", "hero");
    hero.props.title =
      "Award-winning dental clinic with live table availability tonight";
    hero.props.primaryAction = { label: "Book a table", href: "/book-now" };

    const menu = sectionOn(unsafe, "/menu", "services");
    (menu.props.items as unknown[]).push({
      title: "Invented tasting menu",
      description: "Guaranteed organic and allergen-free",
      meta: "INR 999",
    });

    const team = sectionOn(unsafe, "/story", "team");
    (team.props.items as unknown[]).push({
      title: "Invented award-winning chef",
      description: "Five-star restaurant founder",
    });
    team.hidden = false;

    const reservation = sectionOn(unsafe, "/reservations", "contact");
    reservation.props.receiptMessage = "Your table is confirmed";
    reservation.bindings.reservation = {
      actionId: "booking.request",
      inputMap: {},
    };

    const cleaned = applyRestaurantDraftContentHygiene(unsafe);
    const secondPass = applyRestaurantDraftContentHygiene(cleaned.site);
    const cleanedText = JSON.stringify(cleaned.site);
    const cleanedMenuItems = sectionOn(cleaned.site, "/menu", "services").props
      .items as Array<Record<string, unknown>>;
    const cleanedTeamItems = sectionOn(cleaned.site, "/story", "team").props
      .items as Array<Record<string, unknown>>;

    expect(cleaned.changed).toBe(true);
    expect(secondPass.changed).toBe(false);
    expect(secondPass.site).toEqual(cleaned.site);
    expect(cleanedText).not.toMatch(
      /dental clinic|live table availability|Invented tasting menu|INR 999|Invented award-winning chef|Your table is confirmed/i,
    );
    expect(cleanedMenuItems.map((item) => item.title)).toEqual([
      "Charred corn chaat",
      "Pepper chicken",
      "Vegetable biryani",
    ]);
    expect(cleanedMenuItems.map((item) => item.meta)).toEqual([
      "INR 320",
      "INR 480",
      "INR 540",
    ]);
    expect(cleanedTeamItems.map((item) => item.title)).toEqual(["Radhika Rao"]);
    expect(
      sectionOn(cleaned.site, "/reservations", "contact").bindings.reservation
        ?.actionId,
    ).toBe("reservation.request");
    expect(restaurantDraftContentIssues(cleaned.site)).toEqual([]);
  });

  test("renders matching menu metadata and reservation controls in the static export", async () => {
    const site = applyRestaurantDraftMedia(
      createRestaurantDraftScaffold(sourceSite(), REFERENCE_BRIEF),
    );
    const files = await buildStaticProject({
      published: {
        siteId: site.siteId,
        versionId: "restaurant-reference-version-1",
        snapshot: site,
        snapshotHash: "b".repeat(64),
      },
      requestOrigin: "https://builder.micirql.com",
      publicFunctionsOrigin: "https://forms.micirql.com",
      generatedAt: "2026-10-24T00:00:00.000Z",
    });
    const decode = (path: string) =>
      new TextDecoder().decode(files.find((file) => file.path === path)!.bytes);
    const menu = decode("menu/index.html");
    const reservations = decode("reservations/index.html");
    const contact = decode("contact/index.html");
    const gallery = sectionOn(site, "/menu", "gallery");
    const galleryItem = (
      gallery.props.items as Array<Record<string, unknown>>
    )[0]!;
    const galleryImage = galleryItem.image as Record<string, unknown>;

    expect(menu).toContain("Small plates");
    expect(menu).toContain("Rice and mains");
    expect(menu).toContain("Charred corn chaat");
    expect(menu).toContain('<p class="mi-card__meta">INR 320</p>');
    expect(menu).toContain('<div class="mi-gallery">');
    expect(menu).toContain(`alt="${String(galleryImage.alt)}" loading="lazy"`);
    expect(String(galleryImage.alt)).toContain("not a verified");
    expect(menu).not.toContain(`<h3>${String(galleryItem.title)}</h3>`);
    expect(reservations).toContain(">Request a table</button>");
    expect(reservations).toContain('name="requestedDate"');
    expect(reservations).toContain('name="requestedTime"');
    expect(reservations).toContain('name="partySize"');
    expect(reservations).not.toContain("Request reservation");
    expect(contact).toContain(">Send enquiry</button>");
    expect(contact).not.toContain('name="requestedDate"');
  });

  test("remains planned and absent from every certified selection path", () => {
    expect(
      INDUSTRY_AVAILABILITY.find(
        (entry) => entry.id === restaurantDraftPack.identity.id,
      ),
    ).toMatchObject({ status: "planned", rolloutOrder: 2 });
    expect(listCertifiedIndustryPacks().map((pack) => pack.id)).not.toContain(
      restaurantDraftPack.identity.id,
    );
    expect(
      resolveCertifiedIndustryPackById(restaurantDraftPack.identity.id),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPackByCatalogVersion(
        restaurantDraftPack.identity.catalogVersion,
      ),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPackForSite({
        domain: "restaurant",
        subtype: "restaurant",
      }),
    ).toBeUndefined();
    expect(
      resolveCertifiedIndustryPack({
        domain: "restaurant",
        industry: "Restaurant",
        subindustry: "Restaurant",
        services: ["Dine-in", "Table requests"],
      }),
    ).toBeUndefined();
  });
});

function referenceSite() {
  return createRestaurantDraftScaffold(
    sourceSite(),
    REFERENCE_BRIEF,
    BRAND_INPUT,
    BRAND_PROVENANCE,
  );
}

function sourceSite(): Site {
  return siteSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    siteId: "restaurant-reference-site",
    workspaceId: "restaurant-reference-workspace",
    name: "Draft site",
    domain: "landing-page",
    theme: {
      family: "minimalist",
      modifiers: ["light"],
      brand: {
        colors: {
          primary: "#6D5DFC",
          secondary: "#171717",
          accent: "#8B7FFF",
          background: "#FFFFFF",
          surface: "#F5F5F7",
          textPrimary: "#111111",
          textSecondary: "#65656B",
          border: "#DDDDE3",
          success: "#168A4A",
          warning: "#AD6A00",
          error: "#C93636",
        },
        typography: {
          display: "Arial, sans-serif",
          body: "Arial, sans-serif",
          ui: "Arial, sans-serif",
        },
        density: "comfortable",
        shape: "balanced",
        motion: "subtle",
      },
    },
    seoBlueprint: {
      primaryGoal: "Present the business clearly",
      targetLocations: [],
      priorityTopics: [],
      audiences: [],
      languages: ["en"],
      localSeo: false,
      servicePages: true,
      locationPages: false,
      blog: false,
    },
    pages: [
      {
        id: "home",
        path: "/",
        name: "Home",
        sections: [],
        seo: {
          title: "Draft site",
          description: "Draft website.",
          canonicalPath: "/",
          indexable: true,
          structuredDataTypes: [],
        },
      },
    ],
    navigation: [{ label: "Home", href: "/" }],
    integrations: [],
    domains: [],
  });
}

function sectionOn(site: Site, path: string, family: SectionFamily) {
  const section = site.pages
    .find((page) => page.path === path)
    ?.sections.find((candidate) => sectionFamily(candidate) === family);
  expect(section, `${path} must include ${family}`).toBeDefined();
  return section!;
}

function sectionFamily(section: SiteSection): SectionFamily {
  const code = section.component.componentId
    .toUpperCase()
    .match(
      /-(NAV|HERO|ABOUT|SERV|FEAT|PROC|TEST|GALL|TEAM|CTA|CONT|FOOT)-/,
    )?.[1];
  const family = {
    NAV: "navbar",
    HERO: "hero",
    ABOUT: "about",
    SERV: "services",
    FEAT: "features",
    PROC: "process",
    TEST: "testimonials",
    GALL: "gallery",
    TEAM: "team",
    CTA: "cta",
    CONT: "contact",
    FOOT: "footer",
  }[code ?? ""];
  if (!family) {
    throw new Error(
      `Unknown section family for ${section.component.componentId}`,
    );
  }
  return family as SectionFamily;
}

function imageReferences(
  value: unknown,
): Array<{ assetId: string; alt: string }> {
  if (Array.isArray(value)) return value.flatMap(imageReferences);
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const assetId = typeof record.assetId === "string" ? record.assetId : "";
  const source = typeof record.src === "string" ? record.src : "";
  if (assetId && source) {
    return [
      {
        assetId,
        alt: typeof record.alt === "string" ? record.alt : "",
      },
    ];
  }
  return Object.values(record).flatMap(imageReferences);
}
