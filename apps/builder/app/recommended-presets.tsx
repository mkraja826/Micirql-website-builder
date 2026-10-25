"use client";

import type { IndustryPackCandidate } from "./industry-packs";
import { resolveCertifiedIndustryPackRuntime } from "./industry-packs";
import type { OnboardingProfile } from "./preset-ranking";
import styles from "./recommended-presets.module.css";

export type { OnboardingProfile } from "./preset-ranking";

export function RecommendedPresets({ profile, onApply }: { profile?: OnboardingProfile | null; onApply(preset: IndustryPackCandidate): void }) {
  if (!profile) return null;
  const runtime = resolveCertifiedIndustryPackRuntime(profile);
  const ranked = runtime?.rankCandidates(profile).slice(0, 3) ?? [];
  if (!ranked.length) return null;
  return <section className={styles.root}>
    <div className={styles.heading}><span>Recommended for this business</span><small>Based on the saved discovery profile</small></div>
    <div className={styles.grid}>{ranked.map(({candidate,reasons},index)=><button type="button" key={candidate.id} onClick={()=>onApply(candidate)}>
      <div className={styles.badge}>{index===0?"Best match":`#${index+1}`}</div>
      <strong>{candidate.name}</strong>
      <small>{reasons.slice(0,2).join(" · ") || candidate.description}</small>
    </button>)}</div>
  </section>;
}
