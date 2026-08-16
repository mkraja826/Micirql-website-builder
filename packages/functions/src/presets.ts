export type FunctionalPresetKind = "native" | "link";
export type FunctionalPresetCategory = "enquiry" | "booking" | "communication" | "location" | "growth";

export type FunctionalPreset = {
  id: string;
  label: string;
  description: string;
  kind: FunctionalPresetKind;
  category: FunctionalPresetCategory;
  actionId?: string;
  bindingKey?: string;
  hrefScheme?: "tel" | "mailto" | "https";
  valueType?: "phone" | "email" | "whatsapp" | "url" | "address";
  ctaLabel: string;
  industries: string[];
};

/**
 * Stable function vocabulary used by Builder, industry intelligence and validators.
 * Native presets execute through the MiCirql function gateway. Link presets are
 * deterministic browser actions and never require custom user code.
 */
export const functionalPresets: FunctionalPreset[] = [
  { id: "enquiry.general", label: "Enquiry form", description: "Capture a general website enquiry.", kind: "native", category: "enquiry", actionId: "lead.create", bindingKey: "submit", ctaLabel: "Send enquiry", industries: ["all"] },
  { id: "appointment.request", label: "Appointment request", description: "Capture an appointment request without claiming availability.", kind: "native", category: "booking", actionId: "appointment.request", bindingKey: "appointment", ctaLabel: "Request appointment", industries: ["dental", "healthcare", "clinic", "salon", "wellness"] },
  { id: "reservation.request", label: "Table reservation request", description: "Capture a restaurant reservation request without confirming a table.", kind: "native", category: "booking", actionId: "reservation.request", bindingKey: "reservation", ctaLabel: "Request a table", industries: ["restaurant", "cafe", "hospitality"] },
  { id: "quote.request", label: "Quote request", description: "Capture a service or project quotation request.", kind: "native", category: "enquiry", actionId: "quote.request", bindingKey: "quote", ctaLabel: "Request a quote", industries: ["consulting", "professional-services", "construction", "corporate", "industrial"] },
  { id: "property.enquiry", label: "Property enquiry", description: "Capture enquiries for a property, project, visit or brochure.", kind: "native", category: "enquiry", actionId: "property.enquiry", bindingKey: "propertyEnquiry", ctaLabel: "Enquire now", industries: ["real-estate", "property"] },
  { id: "demo.request", label: "Product demo request", description: "Capture a SaaS or technology product demo request.", kind: "native", category: "enquiry", actionId: "demo.request", bindingKey: "demo", ctaLabel: "Request demo", industries: ["saas", "software", "technology"] },
  { id: "booking.request", label: "Booking enquiry", description: "Capture a hospitality booking request without confirming inventory.", kind: "native", category: "booking", actionId: "booking.request", bindingKey: "booking", ctaLabel: "Request booking", industries: ["hospitality", "hotel", "travel"] },
  { id: "enrollment.enquiry", label: "Enrollment enquiry", description: "Capture an education or training programme enquiry.", kind: "native", category: "enquiry", actionId: "enrollment.enquiry", bindingKey: "enrollment", ctaLabel: "Enquire about enrollment", industries: ["education", "training"] },
  { id: "newsletter.subscribe", label: "Newsletter signup", description: "Subscribe a consenting visitor to site updates.", kind: "native", category: "growth", actionId: "newsletter.subscribe", bindingKey: "subscribe", ctaLabel: "Subscribe", industries: ["all"] },
  { id: "contact.phone", label: "Call business", description: "Open the visitor's phone dialer with the supplied business number.", kind: "link", category: "communication", hrefScheme: "tel", valueType: "phone", ctaLabel: "Call now", industries: ["all"] },
  { id: "contact.email", label: "Email business", description: "Open the visitor's email app with the supplied business address.", kind: "link", category: "communication", hrefScheme: "mailto", valueType: "email", ctaLabel: "Email us", industries: ["all"] },
  { id: "contact.whatsapp", label: "WhatsApp", description: "Open a WhatsApp conversation using a verified business number.", kind: "link", category: "communication", hrefScheme: "https", valueType: "whatsapp", ctaLabel: "WhatsApp us", industries: ["dental", "healthcare", "restaurant", "real-estate", "consulting", "education", "retail", "hospitality"] },
  { id: "location.directions", label: "Directions", description: "Open map directions for the supplied business address or map URL.", kind: "link", category: "location", hrefScheme: "https", valueType: "address", ctaLabel: "Get directions", industries: ["dental", "healthcare", "restaurant", "retail", "education", "hospitality", "real-estate"] },
  { id: "booking.external", label: "External booking", description: "Open an existing verified booking or scheduling URL.", kind: "link", category: "booking", hrefScheme: "https", valueType: "url", ctaLabel: "Book now", industries: ["all"] },
];

export function getFunctionalPreset(id: string) {
  return functionalPresets.find((preset) => preset.id === id);
}

export function recommendFunctionalPresets(industry?: string | null) {
  const normalized = (industry ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  return functionalPresets.filter((preset) => preset.industries.includes("all") || preset.industries.some((item) => normalized.includes(item) || item.includes(normalized)));
}

export function buildFunctionalHref(presetId: string, rawValue: string): string | null {
  const preset = getFunctionalPreset(presetId);
  const value = rawValue.trim();
  if (!preset || preset.kind !== "link" || !value) return null;
  if (preset.valueType === "phone") return `tel:${value.replace(/[^+\d]/g, "")}`;
  if (preset.valueType === "email") return `mailto:${value}`;
  if (preset.valueType === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
  if (preset.valueType === "address") {
    if (/^https:\/\//i.test(value)) return value;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  }
  if (preset.valueType === "url") return /^https:\/\//i.test(value) ? value : `https://${value}`;
  return null;
}
