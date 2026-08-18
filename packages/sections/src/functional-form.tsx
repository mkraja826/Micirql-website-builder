import type { UniversalSectionProps } from "./sections";

type Props = UniversalSectionProps & Record<string, unknown>;
type Field = { name: string; label: string; type?: string; required?: boolean; placeholder?: string; min?: number; max?: number };

const BASE: Field[] = [
  { name: "name", label: "Name", required: true },
  { name: "email", label: "Email", type: "email", placeholder: "you@example.com" },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+91 98765 43210" },
];

export function FunctionalContactForm(props: Props) {
  if (!props.formAction) return null;
  const actionId = String(props.formActionId ?? detectActionId(props));
  const fields = [...baseFieldsFor(actionId), ...fieldsFor(actionId)];
  const submit = submitLabel(actionId);
  const status = actionId === "appointment.request"
    ? "Send your preferred treatment and time. The clinic will contact you to confirm the appointment."
    : "Submitting this form sends a request. Appointments, reservations and bookings are confirmed separately.";
  return <form id="enquiry" className="mi-contact-form mi-functional-form" action={props.formAction} method="post" data-mi-action-id={actionId}>
    {props.formWorkspaceId ? <input type="hidden" name="workspaceId" value={String(props.formWorkspaceId)} /> : null}
    {props.formSiteId ? <input type="hidden" name="siteId" value={String(props.formSiteId)} /> : null}
    <input type="hidden" name="actionId" value={actionId} />
    {props.formSourcePage ? <input type="hidden" name="sourcePage" value={String(props.formSourcePage)} /> : null}
    <input type="text" name="website" tabIndex={-1} autoComplete="off" className="mi-form-honeypot" aria-hidden="true" />
    <div className="mi-functional-form__grid">
      {fields.map((field) => <label key={field.name} className={wideField(field.name) ? "mi-form-field--wide" : undefined}>
        <span>{field.label}{field.required ? " *" : ""}</span>
        <input name={field.name} type={field.type ?? "text"} required={field.required} placeholder={field.placeholder} min={field.min} max={field.max} autoComplete={autoComplete(field.name)} />
      </label>)}
      {actionId === "enrollment.enquiry" ? <label><span>Delivery mode</span><select name="deliveryMode" defaultValue="unsure"><option value="unsure">Not sure yet</option><option value="online">Online</option><option value="in-person">In person</option><option value="hybrid">Hybrid</option></select></label> : null}
      {actionId === "property.enquiry" ? <label><span>Enquiry type</span><select name="enquiryType" defaultValue="details"><option value="details">Property details</option><option value="visit">Arrange a visit</option><option value="brochure">Request brochure</option><option value="callback">Request callback</option></select></label> : null}
      <label className="mi-form-field--wide"><span>Message</span><textarea name="message" rows={5} placeholder={actionId === "appointment.request" ? "Share any symptoms, concerns, or accessibility needs" : "Tell us how we can help"} /></label>
    </div>
    <label className="mi-form-consent"><input type="checkbox" name="consent" value="true" required /> <span>I agree to be contacted about this request.</span></label>
    <button type="submit" className="mi-functional-form__submit">{submit}</button>
    <p className="mi-form-status" data-mi-form-status aria-live="polite">{status}</p>
  </form>;
}

function baseFieldsFor(actionId: string): Field[] {
  if (actionId === "appointment.request") return BASE.map((field) => field.name === "phone" ? { ...field, required: true } : field);
  return BASE;
}

function fieldsFor(actionId: string): Field[] {
  if (actionId === "appointment.request") return [{ name: "service", label: "Treatment / service", required: true }, { name: "clinician", label: "Preferred clinician" }, { name: "preferredDate", label: "Preferred date", type: "date" }, { name: "preferredTime", label: "Preferred time", type: "time" }];
  if (actionId === "reservation.request") return [{ name: "requestedDate", label: "Date", type: "date", required: true }, { name: "requestedTime", label: "Time", type: "time", required: true }, { name: "partySize", label: "Guests", type: "number", required: true, min: 1, max: 100 }];
  if (actionId === "quote.request") return [{ name: "service", label: "Service", required: true }, { name: "location", label: "Project location" }, { name: "budgetRange", label: "Budget range" }];
  if (actionId === "property.enquiry") return [{ name: "propertyId", label: "Property / project", required: true }];
  if (actionId === "demo.request") return [{ name: "company", label: "Company" }, { name: "role", label: "Role" }];
  if (actionId === "booking.request") return [{ name: "checkIn", label: "Check in", type: "date", required: true }, { name: "checkOut", label: "Check out", type: "date", required: true }, { name: "guests", label: "Guests", type: "number", required: true, min: 1, max: 50 }, { name: "roomPreference", label: "Room preference" }];
  if (actionId === "enrollment.enquiry") return [{ name: "course", label: "Course / programme" }];
  return [];
}

function submitLabel(actionId: string) { if (actionId === "appointment.request") return "Request appointment"; if (actionId === "reservation.request") return "Request reservation"; if (actionId === "quote.request") return "Request quote"; if (actionId === "property.enquiry") return "Send property enquiry"; if (actionId === "demo.request") return "Request demo"; if (actionId === "booking.request") return "Request booking"; if (actionId === "enrollment.enquiry") return "Send enrollment enquiry"; return "Send enquiry"; }
function detectActionId(props: Props) { const keys = Object.keys(props); const known = ["appointment.request","reservation.request","quote.request","property.enquiry","demo.request","booking.request","enrollment.enquiry","lead.create"]; return known.find((id) => keys.some((key) => props[key] === id)) ?? "lead.create"; }
function autoComplete(name: string) { return name === "name" ? "name" : name === "email" ? "email" : name === "phone" ? "tel" : undefined; }
function wideField(name: string) { return ["service","clinician","location","budgetRange","propertyId","company","role","roomPreference","course"].includes(name); }
