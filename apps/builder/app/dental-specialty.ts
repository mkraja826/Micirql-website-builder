import type { OnboardingProfile } from "./preset-ranking";

export type DentalTreatmentId =
  | "implant"
  | "cosmetic"
  | "rehabilitation"
  | "crowns"
  | "orthodontics"
  | "endodontics"
  | "general";

export type DentalTreatmentSignal = {
  id: DentalTreatmentId;
  pattern: RegExp;
};

export const DENTAL_TREATMENT_TERMS: DentalTreatmentSignal[] = [
  { id: "implant", pattern: /\bimplant(?:s| dentistry)?\b|full[- ]arch|all[- ]on[- ](?:4|6)/i },
  { id: "cosmetic", pattern: /cosmetic dentistry|smile design|smile makeover|veneer(?:s)?/i },
  { id: "rehabilitation", pattern: /full[- ]mouth rehabilitation|mouth rehabilitation|bite rehabilitation/i },
  { id: "crowns", pattern: /\bcrown(?:s)?\b|ceramic restoration/i },
  { id: "orthodontics", pattern: /orthodont|aligner|braces/i },
  { id: "endodontics", pattern: /root canal|endodont/i },
  { id: "general", pattern: /general dentistry|family dentistry|family dental|preventive dentistry/i },
];

const PRIORITY: DentalTreatmentId[] = [
  "implant",
  "cosmetic",
  "orthodontics",
  "endodontics",
  "rehabilitation",
  "crowns",
  "general",
];

export function dentalProfileText(profile: OnboardingProfile): string {
  return [
    profile.industry,
    profile.subindustry,
    ...(profile.services ?? []),
    ...(profile.goals ?? []),
    ...(profile.required_capabilities ?? []),
    profile.notes,
  ].filter(Boolean).join(" ");
}

export function requestedDentalTreatments(profile: OnboardingProfile): DentalTreatmentSignal[] {
  const input = dentalProfileText(profile);
  return DENTAL_TREATMENT_TERMS.filter((term) => term.pattern.test(input));
}

export function primaryDentalTreatment(profile: OnboardingProfile): DentalTreatmentId | undefined {
  const requested = new Set(requestedDentalTreatments(profile).map((term) => term.id));
  return PRIORITY.find((id) => requested.has(id));
}

export function isDentalProfileSignal(profile: OnboardingProfile): boolean {
  return /dental|dentist|dentistry|orthodont|endodont|implant|veneer|root canal|braces|aligner/i.test(dentalProfileText(profile));
}
