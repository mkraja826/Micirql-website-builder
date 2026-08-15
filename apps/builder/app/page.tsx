"use client";

import WorkspaceClient from "./workspace-client";
import { AuthGate } from "./auth-gate";

export default function BuilderHome() {
  return <AuthGate>{() => <WorkspaceClient />}</AuthGate>;
}
