"use client";

import { AuthGate } from "./auth-gate";
import { ProjectDashboard } from "./project-dashboard";

export default function BuilderHome() {
  return <AuthGate>{(session) => <ProjectDashboard session={session} />}</AuthGate>;
}
