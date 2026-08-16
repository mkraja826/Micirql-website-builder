export type IndustryFunctionStrategy = {
  key: string;
  primaryPresetIds: string[];
  secondaryPresetIds: string[];
  rationale: string;
};

const strategies: IndustryFunctionStrategy[] = [
  { key: "dental", primaryPresetIds: ["appointment.request", "contact.phone", "contact.whatsapp"], secondaryPresetIds: ["enquiry.general", "location.directions"], rationale: "Patients usually need an appointment path plus immediate contact options." },
  { key: "healthcare", primaryPresetIds: ["appointment.request", "contact.phone"], secondaryPresetIds: ["enquiry.general", "location.directions", "contact.whatsapp"], rationale: "Healthcare sites should make requesting care and reaching the clinic obvious." },
  { key: "restaurant", primaryPresetIds: ["reservation.request", "contact.phone", "location.directions"], secondaryPresetIds: ["contact.whatsapp", "enquiry.general"], rationale: "Restaurants benefit from reservation, call and directions actions." },
  { key: "saas", primaryPresetIds: ["demo.request", "enquiry.general"], secondaryPresetIds: ["contact.email", "newsletter.subscribe", "booking.external"], rationale: "SaaS conversion usually centers on demos, enquiries and product-led follow-up." },
  { key: "software", primaryPresetIds: ["demo.request", "enquiry.general"], secondaryPresetIds: ["contact.email", "newsletter.subscribe"], rationale: "Software sites typically convert through demos or sales enquiries." },
  { key: "real-estate", primaryPresetIds: ["property.enquiry", "contact.phone", "contact.whatsapp"], secondaryPresetIds: ["location.directions", "enquiry.general"], rationale: "Property buyers need fast enquiry, callback and visit pathways." },
  { key: "consulting", primaryPresetIds: ["quote.request", "enquiry.general"], secondaryPresetIds: ["contact.email", "booking.external"], rationale: "Professional services usually convert through scoped enquiries or consultation requests." },
  { key: "professional-services", primaryPresetIds: ["quote.request", "enquiry.general"], secondaryPresetIds: ["contact.email", "booking.external"], rationale: "Service firms benefit from enquiry, quote and consultation pathways." },
  { key: "education", primaryPresetIds: ["enrollment.enquiry", "enquiry.general"], secondaryPresetIds: ["contact.phone", "contact.whatsapp", "location.directions"], rationale: "Prospective learners need a clear enquiry path and accessible admissions contact." },
  { key: "hospitality", primaryPresetIds: ["booking.request", "contact.phone"], secondaryPresetIds: ["booking.external", "contact.whatsapp", "location.directions"], rationale: "Hospitality sites should lead with booking while preserving direct contact and directions." },
  { key: "corporate", primaryPresetIds: ["enquiry.general", "quote.request"], secondaryPresetIds: ["contact.email", "contact.phone"], rationale: "Corporate sites usually need a reliable general or commercial enquiry path." },
  { key: "default", primaryPresetIds: ["enquiry.general", "contact.phone", "contact.email"], secondaryPresetIds: ["contact.whatsapp", "location.directions", "newsletter.subscribe"], rationale: "A general business site should provide at least one enquiry route and one direct contact method." },
];

export function getIndustryFunctionStrategy(industry?: string | null): IndustryFunctionStrategy {
  const normalized = (industry ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return strategies.find((strategy) => strategy.key !== "default" && (normalized.includes(strategy.key) || strategy.key.includes(normalized))) ?? strategies[strategies.length - 1]!;
}

export function rankFunctionalPresetIds(industry?: string | null): string[] {
  const strategy = getIndustryFunctionStrategy(industry);
  return [...strategy.primaryPresetIds, ...strategy.secondaryPresetIds];
}
