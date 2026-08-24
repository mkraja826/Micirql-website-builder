import { expect, test } from "@playwright/test";
import {
  explicitAddressesFromBrief,
  explicitBusinessNameFromBrief,
  repairExplicitIdentity,
} from "../apps/builder/app/api/onboarding/interpret/route";
import type { InterpretedOnboardingBrief } from "../apps/builder/app/onboarding-brief-intelligence";

const pearlDentalPrompt = `Create a premium, modern website for Pearl Dental, a professional dental clinic.
Services: Dental Implants, Root Canal Treatment, Teeth Whitening, Braces & Aligners, Dental Crowns, General Dentistry.
The website should feel premium, modern, professional, clean, friendly and trustworthy, with strong visual hierarchy and polished UI/UX.
Primary goals: book appointments, build patient trust, generate leads, and showcase treatments/results.
Include clear treatment/service sections, appointment CTAs, contact form, gallery, clinic location/maps, treatment journey, and appropriate trust-building sections.
Use a high-quality responsive design suitable for both mobile and desktop. Do not invent doctors, reviews, awards, addresses, statistics, prices, or other unverified business information.`;

test("extracts an explicit business name from website-for phrasing", () => {
  expect(explicitBusinessNameFromBrief(pearlDentalPrompt)).toBe("Pearl Dental");
});

test("negative instructions do not become addresses", () => {
  expect(explicitAddressesFromBrief(pearlDentalPrompt)).toEqual([]);
});

test("repair restores the explicit identity and clears hallucinated address evidence", () => {
  const profile = {
    businessName: "My Business",
    industry: "dental",
    subindustry: "",
    location: "",
    services: ["Dental Implants"],
    goals: ["book appointments"],
    styleTags: ["premium"],
    requiredCapabilities: ["booking"],
    languages: ["en"],
    notes: "Business name: not supplied\nLocation: not supplied\nAddresses: es, statistics, prices, or other unverified business information",
    lockedFacts: {
      businessName: "",
      location: "",
      addresses: ["es, statistics, prices, or other unverified business information"],
      phoneNumbers: [],
      emails: [],
      urls: [],
      people: [],
      credentials: [],
      prices: [],
      openingHours: [],
      claims: [],
    },
    source: "deterministic-fallback",
  } satisfies InterpretedOnboardingBrief;

  const repaired = repairExplicitIdentity(profile, pearlDentalPrompt);
  expect(repaired.businessName).toBe("Pearl Dental");
  expect(repaired.lockedFacts.businessName).toBe("Pearl Dental");
  expect(repaired.lockedFacts.addresses).toEqual([]);
  expect(repaired.notes).toContain("Business name: Pearl Dental");
  expect(repaired.notes).toContain("Addresses: not supplied");
});
