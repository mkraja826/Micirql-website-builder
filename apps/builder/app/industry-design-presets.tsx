"use client";

import type { Site } from "@micirql/schema";
import {
  INDUSTRY_DESIGN_PRESETS,
} from "./industry-design-preset-data";
import {
  resolveCertifiedIndustryPackRuntimeForSite,
  type IndustryPackCandidate,
} from "./industry-packs";
import { RecommendedPresets } from "./recommended-presets";
import { useOnboardingProfile } from "./onboarding-profile-context";
import styles from "./industry-design-presets.module.css";

export { INDUSTRY_DESIGN_PRESETS, type IndustryDesignPreset } from "./industry-design-preset-data";

export function IndustryDesignPresets({ site, onApply }: { site: Site; onApply(preset: IndustryPackCandidate): void }) {
  const profile = useOnboardingProfile();
  const industryRuntime = resolveCertifiedIndustryPackRuntimeForSite({
    domain: site.domain,
    subtype: site.subtype ?? null,
  });
  if (!industryRuntime) {
    return <section className={styles.root}>
      <span className={styles.label}>Industry designs</span>
      <p className={styles.notice}>This industry pack is not yet certified. Your existing site remains fully editable.</p>
    </section>;
  }
  const presets = industryRuntime.listCandidates();
  const packProfile = profile
    ? {
        ...profile,
        domain: industryRuntime.pack.domain,
        subindustry: profile.subindustry ?? industryRuntime.pack.subtype,
      }
    : {
        domain: industryRuntime.pack.domain,
        subindustry: industryRuntime.pack.subtype,
      };
  return <section className={styles.root}>
    <RecommendedPresets profile={packProfile} onApply={onApply} />
    <span className={styles.label}>All certified {industryRuntime.pack.label} compositions</span>
    <div className={styles.grid}>
      {presets.map((preset) => <button type="button" key={preset.id} onClick={() => onApply(preset)}>
        <strong>{preset.name}</strong>
        <small>{preset.description}</small>
      </button>)}
    </div>
  </section>;
}
