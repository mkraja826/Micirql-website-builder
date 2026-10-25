import { expect, test } from "@playwright/test";
import {
  certifiedOnboardingIndustry,
  INDUSTRY_AVAILABILITY,
} from "../apps/builder/app/industry-availability";

test.describe("onboarding industry availability", () => {
  test("exposes Dental and Physiotherapy as distinct certified generation payloads", () => {
    const actionable = INDUSTRY_AVAILABILITY.filter(
      (item) => item.status === "certified",
    );

    expect(actionable).toHaveLength(2);
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

  test("keeps Restaurant visible but non-actionable", () => {
    const restaurant = INDUSTRY_AVAILABILITY.find(
      (item) => item.id === "restaurant-restaurant",
    );
    expect(restaurant).toMatchObject({ status: "planned", rolloutOrder: 2 });
    expect(restaurant).not.toHaveProperty("onboarding");
    expect(
      certifiedOnboardingIndustry("restaurant-restaurant"),
    ).toBeUndefined();
  });
});
