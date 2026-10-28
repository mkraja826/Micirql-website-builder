import { expect, test } from "@playwright/test";
import {
  certifiedOnboardingIndustry,
  INDUSTRY_AVAILABILITY,
} from "../apps/builder/app/industry-availability";

test.describe("onboarding industry availability", () => {
  test("exposes Dental, Physiotherapy and Restaurant as distinct certified generation payloads", () => {
    const actionable = INDUSTRY_AVAILABILITY.filter(
      (item) => item.status === "certified",
    );

    expect(actionable).toHaveLength(3);
    expect(actionable[0]).toMatchObject({
      id: "clinic-dental",
      onboarding: { industry: "dental" },
      brief: {
        focusLabel: "Dental focus",
        directionLabel: "Dental",
      },
    });
    expect(certifiedOnboardingIndustry("clinic-dental")).toEqual(actionable[0]);
    const physiotherapy = INDUSTRY_AVAILABILITY.find(
      (item) => item.id === "clinic-physiotherapy",
    );

    expect(physiotherapy).toMatchObject({
      status: "certified",
      onboarding: { industry: "physiotherapy" },
      brief: {
        focusLabel: "Physiotherapy focus",
        directionLabel: "Physiotherapy",
      },
    });
    expect(certifiedOnboardingIndustry("clinic-physiotherapy")).toEqual(
      physiotherapy,
    );
  });

  test("makes Restaurant actionable with its own brief and generation defaults", () => {
    const restaurant = INDUSTRY_AVAILABILITY.find(
      (item) => item.id === "restaurant-restaurant",
    );
    expect(restaurant).toMatchObject({
      status: "certified",
      onboarding: {
        industry: "restaurant",
        defaultGoals: ["request reservations", "show menu", "plan visits"],
        defaultCapabilities: [
          "contact form",
          "reservation request",
          "menu",
          "gallery",
          "maps",
        ],
      },
      brief: {
        focusLabel: "Cuisine focus",
        directionLabel: "Restaurant",
        servicesPlaceholder: "Dine-in, takeaway, private dining",
      },
    });
    expect(certifiedOnboardingIndustry("restaurant-restaurant")).toEqual(
      restaurant,
    );
  });

  test("keeps Cafe visible as the next planned but non-selectable pack", () => {
    const cafe = INDUSTRY_AVAILABILITY.find(
      (item) => item.id === "restaurant-cafe",
    );
    expect(cafe).toEqual({
      id: "restaurant-cafe",
      label: "Cafe",
      description:
        "A lighter daypart, current-menu, visit and verified order-enquiry journey—distinct from Restaurant reservations.",
      status: "planned",
      rolloutOrder: 3,
    });
    expect(certifiedOnboardingIndustry("restaurant-cafe")).toBeUndefined();
  });
});
