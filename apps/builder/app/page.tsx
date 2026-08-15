"use client";

import { AuthGate } from "./auth-gate";
import { OnboardingGate } from "./onboarding-gate";

export default function BuilderHome() {
  return <AuthGate>{(session) => <OnboardingGate session={session} />}</AuthGate>;
}
