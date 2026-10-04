"use client";

import type { Site } from "@micirql/schema";
import {
  DENTAL_CATALOG_VERSION,
  INDUSTRY_DESIGN_PRESETS,
  listIndustryDesignPresets,
  type IndustryDesignPreset,
} from "./industry-design-preset-data";
import { RecommendedPresets } from "./recommended-presets";
import { useOnboardingProfile } from "./onboarding-profile-context";
import styles from "./industry-design-presets.module.css";

export { INDUSTRY_DESIGN_PRESETS, type IndustryDesignPreset } from "./industry-design-preset-data";

export function IndustryDesignPresets({ site, onApply }: { site: Site; onApply(preset: IndustryDesignPreset): void }) {
  const profile = useOnboardingProfile();
  const profileText = [profile?.industry, profile?.subindustry, ...(profile?.services ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const isDental = site.domain === "clinic" && (
    site.generation?.catalogVersion === DENTAL_CATALOG_VERSION
    || /\b(dental|dentist|dentistry|orthodont|endodont|periodont|prosthodont|implant|oral care)\b/.test(profileText)
  );
  if (!isDental) {
    return <section className={styles.root}>
      <span className={styles.label}>Industry designs</span>
      <p className={styles.notice}>This industry pack is not yet certified. Your existing site remains fully editable.</p>
    </section>;
  }
  const presets = listIndustryDesignPresets("clinic", "dental");
  const dentalProfile = profile
    ? { ...profile, domain: "clinic" as const, subindustry: profile.subindustry ?? "dental" }
    : { domain: "clinic" as const, subindustry: "dental" };
  return <section className={styles.root}>
    <RecommendedPresets profile={dentalProfile} onApply={onApply} />
    <span className={styles.label}>All certified dental compositions</span>
    <div className={styles.grid}>
      {presets.map((preset) => <button type="button" key={preset.id} onClick={() => onApply(preset)}>
        <strong>{preset.name}</strong>
        <small>{preset.description}</small>
      </button>)}
    </div>
  </section>;
}
