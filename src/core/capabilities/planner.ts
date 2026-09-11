import type { ArtDirection } from "../art-direction/schema";

export type CapabilityStatus = "available" | "preview" | "needs_configuration";
export type CapabilityId = "appointment" | "contact" | "click_to_call" | "location";

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

const APPOINTMENT_LED = new Set([
  "conversion-focused",
  "direct-modern",
  "precision-grid",
  "human-narrative",
  "warm-modern",
]);

export function planDentalCapabilities(direction: ArtDirection): CandidateCapabilityPlan {
  const appointmentLed = APPOINTMENT_LED.has(direction.visualStyle);

  const capabilities: PlannedCapability[] = [
    {
      id: "appointment",
      status: "available",
      label: appointmentLed ? "Request an appointment" : "Discuss a visit",
      href: "#contact",
      reason: "Appointment intent can be collected through the contact experience without claiming a live booking system.",
    },
    {
      id: "contact",
      status: "preview",
      label: appointmentLed ? "Send appointment request" : "Send enquiry",
      href: "#contact",
      reason: "The preview form is rendered but no submission backend is activated yet.",
    },
    {
      id: "location",
      status: "needs_configuration",
      label: "Open clinic location",
      reason: "Hyderabad is known, but an exact verified address or map target has not been supplied.",
    },
    {
      id: "click_to_call",
      status: "needs_configuration",
      label: "Call the clinic",
      reason: "A verified clinic phone number has not been supplied.",
    },
  ];

  return {
    primary: appointmentLed ? "appointment" : "contact",
    capabilities,
  };
}

export function capability(plan: CandidateCapabilityPlan, id: CapabilityId) {
  return plan.capabilities.find((item) => item.id === id);
}
