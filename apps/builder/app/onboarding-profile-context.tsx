"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OnboardingProfile } from "./recommended-presets";

const OnboardingProfileContext = createContext<OnboardingProfile | null>(null);

export function OnboardingProfileProvider({ profile, children }: { profile?: OnboardingProfile | null; children: ReactNode }) {
  return <OnboardingProfileContext.Provider value={profile ?? null}>{children}</OnboardingProfileContext.Provider>;
}

export function useOnboardingProfile() {
  return useContext(OnboardingProfileContext);
}
