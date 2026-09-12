import type { ArtDirection } from "../art-direction/schema";
import type { InterpretedBrief } from "../brief/schema";

export type CapabilityStatus = "available" | "preview" | "needs_configuration";
export type CapabilityId = string;

export type PlannedCapability = {
  id: CapabilityId;
  status: CapabilityStatus;
  label: string;
  href?: string;
  reason: string;
};

export type CandidateCapabilityPlan = {
  primary: CapabilityId;
  capabilities: PlannedCapability[];
};

export type CapabilityPlanningInput = {
  direction: ArtDirection;
  requestedCapabilities: string[];
  primaryGoal?: string;
  knownFacts?: Record<string, unknown>;
  labels?: Partial<Record<string, string>>;
};

const ACTION_LED_STYLES = new Set([
  "conversion-focused",
  "direct-modern",
  "precision-grid",
  "human-narrative",
  "warm-modern",
]);

const DEFAULT_LABELS: Record<string, string> = {
  appointment: "Request an appointment",
  contact: "Send enquiry",
  click_to_call: "Call",
  location: "View location",
  booking_enquiry: "Check availability",
  reservation: "Request a reservation",
  menu: "View menu",
  lead_capture: "Send enquiry",
  property_enquiry: "Enquire about a property",
  demo_request: "Request a demo",
  admission_enquiry: "Admissions enquiry",
  job_application: "Apply",
  employer_enquiry: "Hire talent",
};

const PASSIVE_CAPABILITIES = new Set(["location", "menu"]);
const FORM_CAPABILITIES = new Set([
  "appointment",
  "contact",
  "booking_enquiry",
  "reservation",
  "lead_capture",
  "property_enquiry",
  "demo_request",
  "admission_enquiry",
  "job_application",
  "employer_enquiry",
]);

function capabilityLabel(id: string, labels?: Partial<Record<string, string>>) {
  return labels?.[id] ?? DEFAULT_LABELS[id] ?? id.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function choosePrimary(requested: string[], direction: ArtDirection) {
  if (!requested.length) return "contact";
  const actionable = requested.filter((id) => !PASSIVE_CAPABILITIES.has(id));
  if (!actionable.length) return requested[0];
  if (ACTION_LED_STYLES.has(direction.visualStyle)) return actionable[0];
  return actionable.includes("contact") ? "contact" : actionable[0];
}

function hasKnownFact(knownFacts: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => {
    const value = knownFacts[key];
    return typeof value === "string" ? Boolean(value.trim()) : value !== undefined && value !== null;
  });
}

function statusFor(id: string, knownFacts: Record<string, unknown>): CapabilityStatus {
  if (id === "click_to_call") return hasKnownFact(knownFacts, ["phone", "phoneNumber", "telephone"]) ? "available" : "needs_configuration";
  if (id === "location") return hasKnownFact(knownFacts, ["address", "mapUrl", "locationUrl"]) ? "available" : "needs_configuration";
  if (id === "menu") return hasKnownFact(knownFacts, ["menu", "menuUrl"]) ? "available" : "preview";
  if (FORM_CAPABILITIES.has(id)) return "preview";
  return "preview";
}

function hrefFor(id: string, status: CapabilityStatus, knownFacts: Record<string, unknown>) {
  if (status === "needs_configuration") return undefined;
  if (id === "click_to_call") {
    const phone = knownFacts.phone ?? knownFacts.phoneNumber ?? knownFacts.telephone;
    return typeof phone === "string" ? `tel:${phone.replace(/\s+/g, "")}` : undefined;
  }
  if (id === "location") {
    const mapUrl = knownFacts.mapUrl ?? knownFacts.locationUrl;
    return typeof mapUrl === "string" ? mapUrl : "#contact";
  }
  if (id === "menu") {
    const menuUrl = knownFacts.menuUrl;
    return typeof menuUrl === "string" ? menuUrl : "#services";
  }
  return "#contact";
}

function reasonFor(id: string, status: CapabilityStatus, label: string) {
  if (status === "available") return `${label} can be activated from verified business data already present in the brief.`;
  if (status === "needs_configuration") return `${label} requires verified business data before activation.`;
  if (FORM_CAPABILITIES.has(id)) return `${label} is rendered as a preview intent until its submission or external workflow is configured.`;
  return `${label} is represented in preview mode until its underlying content or integration is verified.`;
}

export function planCapabilities(input: CapabilityPlanningInput): CandidateCapabilityPlan {
  const requested = [...new Set(input.requestedCapabilities.filter(Boolean))];
  if (!requested.includes("contact")) requested.push("contact");
  const primary = choosePrimary(requested, input.direction);
  const knownFacts = input.knownFacts ?? {};

  const capabilities = requested.map<PlannedCapability>((id) => {
    const label = capabilityLabel(id, input.labels);
    const status = statusFor(id, knownFacts);
    return {
      id,
      status,
      label,
      href: hrefFor(id, status, knownFacts),
      reason: reasonFor(id, status, label),
    };
  });

  return { primary, capabilities };
}

export function planCapabilitiesFromBrief(
  brief: InterpretedBrief,
  direction: ArtDirection,
  labels?: Partial<Record<string, string>>,
): CandidateCapabilityPlan {
  return planCapabilities({
    direction,
    requestedCapabilities: brief.website.capabilities.value,
    primaryGoal: brief.positioning.primaryGoal.value,
    knownFacts: brief.truth.knownFacts,
    labels,
  });
}

export function capability(plan: CandidateCapabilityPlan, id: CapabilityId) {
  return plan.capabilities.find((item) => item.id === id);
}
