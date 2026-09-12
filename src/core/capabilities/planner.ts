import type { ArtDirection } from "../art-direction/schema";

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
const CONFIGURATION_CAPABILITIES = new Set(["click_to_call", "location"]);

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

export function planCapabilities(input: CapabilityPlanningInput): CandidateCapabilityPlan {
  const requested = [...new Set(input.requestedCapabilities.filter(Boolean))];
  if (!requested.includes("contact")) requested.push("contact");
  const primary = choosePrimary(requested, input.direction);

  const capabilities = requested.map<PlannedCapability>((id) => {
    const missingConfiguration = CONFIGURATION_CAPABILITIES.has(id);
    const isContact = id === "contact";
    return {
      id,
      status: missingConfiguration ? "needs_configuration" : isContact ? "preview" : "available",
      label: capabilityLabel(id, input.labels),
      href: missingConfiguration ? undefined : "#contact",
      reason: missingConfiguration
        ? `${capabilityLabel(id, input.labels)} requires verified business data before activation.`
        : isContact
          ? "The enquiry experience is rendered in preview mode until a submission backend is configured."
          : `The ${id.replace(/_/g, " ")} intent can be represented without claiming an activated external system.`,
    };
  });

  return { primary, capabilities };
}

export function capability(plan: CandidateCapabilityPlan, id: CapabilityId) {
  return plan.capabilities.find((item) => item.id === id);
}
