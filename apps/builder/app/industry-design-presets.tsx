"use client";

import { INDUSTRY_DESIGN_PRESETS, type IndustryDesignPreset } from "./industry-design-preset-data";
import { RecommendedPresets } from "./recommended-presets";
import { useOnboardingProfile } from "./onboarding-profile-context";
import styles from "./industry-design-presets.module.css";

export { INDUSTRY_DESIGN_PRESETS, type IndustryDesignPreset } from "./industry-design-preset-data";

export function IndustryDesignPresets({ onApply }: { onApply(preset: IndustryDesignPreset): void }) {
  const profile = useOnboardingProfile();
  return <section className={styles.root}>
    <RecommendedPresets profile={profile} onApply={onApply} />
    <span className={styles.label}>All industry presets</span>
    <div className={styles.grid}>
      {INDUSTRY_DESIGN_PRESETS.map((preset) => <button type="button" key={preset.id} onClick={() => onApply(preset)}>
        <strong>{preset.name}</strong>
        <small>{preset.description}</small>
      </button>)}
    </div>
  </section>;
}
