export type IndustryAvailability =
  | {
      id: string;
      label: string;
      description: string;
      status: "certified";
      onboarding: { industry: string };
      brief: {
        focusLabel: string;
        focusHelper: string;
        focusPlaceholder: string;
        directionLabel: string;
        businessNamePlaceholder: string;
        servicesPlaceholder: string;
        trustFactsPlaceholder: string;
      };
    }
  | {
      id: string;
      label: string;
      description: string;
      status: "validation" | "planned";
      rolloutOrder: number;
    };

/**
 * Presentation-only rollout list. Planned rows deliberately have no
 * onboarding payload and cannot be submitted to the generation API.
 */
export const INDUSTRY_AVAILABILITY: readonly IndustryAvailability[] = [
  {
    id: "clinic-dental",
    label: "Dental clinic",
    description:
      "Patient-first clinic structure, treatment discovery and appointment journeys.",
    status: "certified",
    onboarding: { industry: "dental" },
    brief: {
      focusLabel: "Dental focus",
      focusHelper: "Optional specialties or patient groups",
      focusPlaceholder: "Implants, orthodontics, family dentistry",
      directionLabel: "Dental",
      businessNamePlaceholder: "Radhika Dental",
      servicesPlaceholder: "Dental implants, crowns, root canal treatment",
      trustFactsPlaceholder:
        "Dr Radhika Rao, MDS Prosthodontics; wheelchair-accessible clinic…",
    },
  },
  {
    id: "clinic-physiotherapy",
    label: "Physiotherapy clinic",
    description:
      "Movement-led care journeys for conditions, services and assessment requests.",
    status: "certified",
    onboarding: { industry: "physiotherapy" },
    brief: {
      focusLabel: "Physiotherapy focus",
      focusHelper: "Optional programmes, needs or patient groups",
      focusPlaceholder: "Sports rehabilitation, mobility, post-operative care",
      directionLabel: "Physiotherapy",
      businessNamePlaceholder: "Radhika Physiotherapy",
      servicesPlaceholder:
        "Physiotherapy assessment, sports rehabilitation, mobility support",
      trustFactsPlaceholder:
        "Verified physiotherapist name and registration; wheelchair access…",
    },
  },
  {
    id: "restaurant-restaurant",
    label: "Restaurant",
    description: "Menu discovery, venue storytelling and reservation journeys.",
    status: "planned",
    rolloutOrder: 2,
  },
] as const;

export function certifiedOnboardingIndustry(packId: string) {
  const item = INDUSTRY_AVAILABILITY.find(
    (candidate) => candidate.id === packId,
  );
  return item?.status === "certified" ? item : undefined;
}
