"use client";

import { getDomainPack } from "@micirql/domains";
import { nativeFunctionCatalog } from "@micirql/functions";
import type { Site, SiteSection } from "@micirql/schema";

const LABELS: Record<string, string> = {
  "lead.create": "Contact / enquiry form",
  "appointment.request": "Appointment request",
  "reservation.request": "Reservation request",
  "quote.request": "Quote request",
  "newsletter.subscribe": "Newsletter signup",
  "property.enquiry": "Property enquiry",
  "demo.request": "Demo request",
  "booking.request": "Booking enquiry",
  "enrollment.enquiry": "Enrollment enquiry",
};

export function FunctionsManager({ site, section, onBind, onRemove }: {
  site: Site;
  section: SiteSection;
  onBind(bindingKey: string, actionId: string): void;
  onRemove(bindingKey: string): void;
}) {
  const pack = getDomainPack(site.domain);
  const recommended = new Set([...pack.requiredActions, ...pack.optionalActions]);
  const entries = nativeFunctionCatalog
    .map((definition) => ({ definition, recommended: recommended.has(definition.id) }))
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.definition.id.localeCompare(b.definition.id));
  const current = Object.entries(section.bindings);

  return <div className="functions-manager">
    <div className="functions-summary">
      <strong>Section functionality</strong>
      <span>Bind approved MiCirql actions. No custom endpoint or backend code is exposed here.</span>
    </div>

    {current.length ? <div className="binding-list">
      {current.map(([key, binding]) => <div className="binding-row" key={key}>
        <div><strong>{LABELS[binding.actionId] ?? binding.actionId}</strong><span>{key}</span></div>
        <button type="button" onClick={() => onRemove(key)}>Remove</button>
      </div>)}
    </div> : <p className="functions-empty">No functionality is bound to this section yet.</p>}

    <div className="function-catalog">
      {entries.map(({ definition, recommended: isRecommended }) => {
        const alreadyBound = current.some(([, binding]) => binding.actionId === definition.id);
        const key = defaultBindingKey(definition.id);
        return <button
          type="button"
          key={definition.id}
          className={`function-card ${isRecommended ? "is-recommended" : ""}`}
          disabled={alreadyBound}
          onClick={() => onBind(uniqueBindingKey(section, key), definition.id)}
        >
          <span>
            <strong>{LABELS[definition.id] ?? definition.id}</strong>
            <small>{definition.description}</small>
          </span>
          <b>{alreadyBound ? "Added" : isRecommended ? "Recommended · Add" : "Add"}</b>
        </button>;
      })}
    </div>

    <p className="functions-note">Forms are requests unless the registered backend explicitly confirms an outcome. Appointment, reservation and booking actions therefore never imply availability by default.</p>
  </div>;
}

function defaultBindingKey(actionId: string) {
  if (actionId === "newsletter.subscribe") return "subscribe";
  if (actionId.includes("appointment")) return "appointment";
  if (actionId.includes("reservation")) return "reservation";
  if (actionId.includes("booking")) return "booking";
  if (actionId.includes("quote")) return "quote";
  if (actionId.includes("demo")) return "demo";
  if (actionId.includes("property")) return "propertyEnquiry";
  if (actionId.includes("enrollment")) return "enrollment";
  return "submit";
}

function uniqueBindingKey(section: SiteSection, preferred: string) {
  if (!section.bindings[preferred]) return preferred;
  let suffix = 2;
  while (section.bindings[`${preferred}${suffix}`]) suffix += 1;
  return `${preferred}${suffix}`;
}
