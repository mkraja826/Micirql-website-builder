"use client";

import { useState } from "react";
import { getDomainPack } from "@micirql/domains";
import { buildFunctionalHref, functionalPresets, nativeFunctionCatalog, rankFunctionalPresetIds } from "@micirql/functions";
import type { Site, SiteSection } from "@micirql/schema";
import { useOnboardingProfile } from "./onboarding-profile-context";

export function FunctionsManager({ site, section, onBind, onRemove, onSetPrimaryAction }: {
  site: Site;
  section: SiteSection;
  onBind(bindingKey: string, actionId: string): void;
  onRemove(bindingKey: string): void;
  onSetPrimaryAction?: (href: string, label: string) => void;
}) {
  const pack = getDomainPack(site.domain);
  const profile = useOnboardingProfile();
  const [linkValues, setLinkValues] = useState<Record<string, string>>({});
  const current = Object.entries(section.bindings);
  const recommendedActionIds = new Set([...pack.requiredActions, ...pack.optionalActions]);
  const industryOrder = rankFunctionalPresetIds(profile?.industry);
  const industryRank = new Map(industryOrder.map((id, index) => [id, index]));
  const entries = functionalPresets.map((preset) => {
    const nativeDefinition = preset.actionId ? nativeFunctionCatalog.find((definition) => definition.id === preset.actionId) : undefined;
    const domainRecommended = Boolean(preset.actionId && recommendedActionIds.has(preset.actionId));
    const industryRecommended = industryRank.has(preset.id);
    return { preset, nativeDefinition, recommended: domainRecommended || industryRecommended, rank: industryRank.get(preset.id) ?? 999 };
  }).sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.rank - b.rank || a.preset.category.localeCompare(b.preset.category) || a.preset.label.localeCompare(b.preset.label));

  return <div className="functions-manager">
    <div className="functions-summary">
      <strong>Section functionality</strong>
      <span>Choose approved MiCirql actions. Native actions use the function gateway; phone, email, WhatsApp and directions remain safe browser links.</span>
      {profile?.industry ? <small>Recommended for {profile.industry}: {industryOrder.slice(0, 3).map((id) => functionalPresets.find((item) => item.id === id)?.label).filter(Boolean).join(" · ")}</small> : null}
    </div>

    {current.length ? <div className="binding-list">
      {current.map(([key, binding]) => {
        const preset = functionalPresets.find((item) => item.actionId === binding.actionId);
        return <div className="binding-row" key={key}>
          <div><strong>{preset?.label ?? binding.actionId}</strong><span>{key}</span></div>
          <button type="button" onClick={() => onRemove(key)}>Remove</button>
        </div>;
      })}
    </div> : <p className="functions-empty">No backend action is bound to this section yet.</p>}

    <div className="function-catalog">
      {entries.map(({ preset, nativeDefinition, recommended }) => {
        if (preset.kind === "native" && nativeDefinition) {
          const alreadyBound = current.some(([, binding]) => binding.actionId === preset.actionId);
          return <button
            type="button"
            key={preset.id}
            className={`function-card ${recommended ? "is-recommended" : ""}`}
            disabled={alreadyBound}
            onClick={() => onBind(uniqueBindingKey(section, preset.bindingKey ?? "submit"), preset.actionId!)}
          >
            <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
            <b>{alreadyBound ? "Added" : recommended ? "Recommended · Add" : "Add"}</b>
          </button>;
        }

        const value = linkValues[preset.id] ?? "";
        const href = buildFunctionalHref(preset.id, value);
        const canApply = Boolean(href && onSetPrimaryAction);
        return <div key={preset.id} className={`function-card function-link-card ${recommended ? "is-recommended" : ""}`}>
          <span><strong>{preset.label}</strong><small>{preset.description}</small></span>
          <label>
            <span>{inputLabel(preset.valueType)}</span>
            <input
              value={value}
              inputMode={preset.valueType === "phone" || preset.valueType === "whatsapp" ? "tel" : preset.valueType === "email" ? "email" : "url"}
              placeholder={inputPlaceholder(preset.valueType)}
              onChange={(event) => setLinkValues((currentValues) => ({ ...currentValues, [preset.id]: event.target.value }))}
            />
          </label>
          <button type="button" disabled={!canApply} title={onSetPrimaryAction ? undefined : "Direct CTA wiring is being enabled for this editor surface."} onClick={() => href && onSetPrimaryAction?.(href, preset.ctaLabel)}>Use as primary CTA</button>
        </div>;
      })}
    </div>

    <p className="functions-note">Request actions never imply confirmed availability. Direct contact actions only use values supplied by the user and do not create hidden integrations.</p>
  </div>;
}

function uniqueBindingKey(section: SiteSection, preferred: string) {
  if (!section.bindings[preferred]) return preferred;
  let suffix = 2;
  while (section.bindings[`${preferred}${suffix}`]) suffix += 1;
  return `${preferred}${suffix}`;
}

function inputLabel(valueType?: string) {
  if (valueType === "phone") return "Phone number";
  if (valueType === "email") return "Email address";
  if (valueType === "whatsapp") return "WhatsApp number";
  if (valueType === "address") return "Address or Maps URL";
  return "Booking URL";
}

function inputPlaceholder(valueType?: string) {
  if (valueType === "phone") return "+91 98765 43210";
  if (valueType === "email") return "hello@example.com";
  if (valueType === "whatsapp") return "+91 98765 43210";
  if (valueType === "address") return "Business address";
  return "https://...";
}
