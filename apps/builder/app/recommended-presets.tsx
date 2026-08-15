"use client";

import type { IndustryDesignPreset } from "./industry-design-preset-data";
import { rankPresets, type OnboardingProfile } from "./preset-ranking";
import styles from "./recommended-presets.module.css";

export type { OnboardingProfile } from "./preset-ranking";

export function RecommendedPresets({ profile, onApply }: { profile?: OnboardingProfile | null; onApply(preset: IndustryDesignPreset): void }) {
  if (!profile) return null;
  const ranked = rankPresets(profile).slice(0, 3);
  if (!ranked.length) return null;
  return <section className={styles.root}>
    <div className={styles.heading}><span>Recommended for this business</span><small>Based on the saved discovery profile</small></div>
    <div className={styles.grid}>{ranked.map(({preset,reasons},index)=><button type="button" key={preset.id} onClick={()=>onApply(preset)}>
      <div className={styles.badge}>{index===0?"Best match":`#${index+1}`}</div>
      <strong>{preset.name}</strong>
      <small>{reasons.slice(0,2).join(" · ") || preset.description}</small>
    </button>)}</div>
  </section>;
}
