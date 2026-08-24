import { expect, test } from "@playwright/test";

const now = new Date().toISOString();
const project = {
  id: "journey-site",
  workspace_id: "journey-workspace",
  name: "Harbor Dental Care",
  status: "draft",
  published_version_id: null,
  updated_at: now,
  draft: { revision: 7, updated_at: now },
  hostname: null,
};

const site = {
  schemaVersion: "1.0.0",
  siteId: "journey-site",
  workspaceId: "journey-workspace",
  name: "Harbor Dental Care",
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
        error: "#B42318",
      },
      typography: { display: "Inter", body: "Inter", ui: "Inter" },
      density: "comfortable",
      shape: "balanced",
      motion: "subtle",
    },
  },
  seoBlueprint: {
    primaryGoal: "Book dental appointments",
    targetLocations: ["Hyderabad"],
    priorityTopics: ["Dental implants", "Preventive dentistry"],
    audiences: ["Dental patients"],
    languages: ["en"],
    localSeo: true,
    servicePages: true,
    locationPages: false,
    blog: false,
  },
  pages: [{
    id: "home",
    path: "/",
    name: "Home",
    sections: [
      {
        id: "global-navbar",
        component: { componentId: "navbar.placeholder", version: "1.0.0" },
        props: { brandName: "Harbor Dental Care" },
        bindings: {}, hidden: false,
      },
      {
        id: "hero",
        component: { componentId: "hero.placeholder", version: "1.0.0" },
        props: {
          eyebrow: "Dental care in Hyderabad",
          heading: "Confident care with a clear next step",
          body: "Explore treatments and book an appointment with Harbor Dental Care.",
          primaryAction: { label: "Book appointment", href: "#contact" },
        },
        bindings: {}, hidden: false,
      },
      {
        id: "services",
        component: { componentId: "services.placeholder", version: "1.0.0" },
        props: {
          heading: "Dental treatments",
          items: [
            { title: "Dental implants", description: "Consultation and treatment planning." },
            { title: "Preventive care", description: "Routine care for long-term oral health." },
          ],
        },
        bindings: {}, hidden: false,
      },
      {
        id: "cta",
        component: { componentId: "cta.placeholder", version: "1.0.0" },
        props: {
          heading: "Ready to discuss your dental care?",
          primaryAction: { label: "Contact the clinic", href: "#contact" },
        },
        bindings: {}, hidden: false,
      },
      {
        id: "contact",
        component: { componentId: "contact.placeholder", version: "1.0.0" },
        props: {
          heading: "Contact Harbor Dental Care",
          body: "Call the clinic or request an appointment.",
          primaryAction: { label: "Call clinic", href: "tel:+914000000000" },
        },
        bindings: {}, hidden: false,
      },
      {
        id: "global-footer",
        component: { componentId: "footer.placeholder", version: "1.0.0" },
        props: { brandName: "Harbor Dental Care" },
        bindings: {}, hidden: false,
      },
    ],
    seo: {
      title: "Harbor Dental Care | Hyderabad",
      description: "Dental care in Hyderabad.",
      canonicalPath: "/",
      indexable: true,
      structuredDataTypes: ["Dentist", "MedicalClinic"],
    },
  }],
  navigation: [
    { label: "Home", href: "/" },
    { label: "Treatments", href: "#services" },
    { label: "Contact", href: "#contact" },
  ],
  integrations: [],
  domains: [],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("micirql.supabase.session", JSON.stringify({
      access_token: "journey-token",
      refresh_token: "journey-refresh",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "journey-user", email: "journey@micirql.test" },
    }));
  });

  await page.route("**/api/projects**", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { projects: [project] } });
    return route.fulfill({ json: { project } });
  });
  await page.route("**/api/onboarding**", async route => route.fulfill({ json: { completed: true, profile: null } }));
  await page.route("**/api/drafts**", async route => route.fulfill({ json: {
    draft: {
      workspaceId: "journey-workspace",
      siteId: "journey-site",
      revision: 7,
      snapshot: site,
      updatedAt: now,
      updatedBy: "journey-user",
    },
  } }));
  await page.route("**/api/credits**", async route => route.fulfill({ json: { balance: 100 } }));
});

async function assertNoDeadRenderedActions(page: import("@playwright/test").Page) {
  const renderedWebsite = page.locator(".renderer-preview-document").first();
  await expect(renderedWebsite).toBeVisible();
  const invalid = await renderedWebsite.locator("a[href], button:not([data-mi-canvas-action])").evaluateAll((elements) => elements
    .filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    })
    .filter((element) => {
      if (element instanceof HTMLAnchorElement) {
        const href = element.getAttribute("href")?.trim() ?? "";
        return !href || href === "#" || /^(?:javascript|data|file|vbscript):/i.test(href);
      }
      return (element as HTMLButtonElement).disabled;
    })
    .map((element) => ({ tag: element.tagName, text: element.textContent?.trim().slice(0, 50) ?? "" })));
  expect(invalid, `rendered website contains dead actions: ${JSON.stringify(invalid)}`).toEqual([]);
}

test("generated website supports a complete desktop and mobile conversion journey", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open editor" }).first().click();

  await expect(page.getByText("Confident care with a clear next step")).toBeVisible();
  await expect(page.getByText("Dental treatments")).toBeVisible();
  await expect(page.getByText("Contact Harbor Dental Care")).toBeVisible();
  await assertNoDeadRenderedActions(page);

  const book = page.getByRole("link", { name: "Book appointment" }).first();
  await expect(book).toHaveAttribute("href", "#contact");
  await book.click();
  await expect(page.getByText("Contact Harbor Dental Care")).toBeVisible();

  const call = page.getByRole("link", { name: "Call clinic" }).first();
  await expect(call).toHaveAttribute("href", /^tel:/);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Confident care with a clear next step")).toBeVisible();
  await expect(page.getByText("Contact Harbor Dental Care")).toBeVisible();
  await assertNoDeadRenderedActions(page);

  const pageOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
  expect(pageOverflow, "generated mobile site must not overflow horizontally").toBeLessThanOrEqual(1);

  const undersizedCriticalActions = await page.getByRole("link", { name: /Book appointment|Contact the clinic|Call clinic/ }).evaluateAll((links) => links
    .filter((link) => {
      const rect = link.getBoundingClientRect();
      const style = getComputedStyle(link);
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    })
    .filter((link) => {
      const rect = link.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    }).length);
  expect(undersizedCriticalActions, "critical generated-site actions need 44px mobile targets").toBe(0);
});
