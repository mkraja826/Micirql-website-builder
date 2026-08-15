import type { DomainEngineDependencies, DomainRecord } from "./types";
import { beginDomainConnection, disconnectDomain, setPrimaryDomain } from "./engine";
import { buildDomainOnboardingView, type DomainOnboardingView } from "./onboarding";
import { reconcileDomain } from "./orchestrator";

export type DomainOnboardingCommand =
  | { type: "start"; domain: DomainRecord }
  | { type: "refresh"; domainId: string }
  | { type: "make-primary"; domainId: string }
  | { type: "disconnect"; domainId: string };

export type DomainOnboardingCommandResult =
  | { ok: true; view: DomainOnboardingView }
  | { ok: false; code: "NOT_FOUND" | "INVALID_STATE" | "PROVIDER_ERROR"; message: string };

export async function executeDomainOnboardingCommand(
  dependencies: DomainEngineDependencies,
  command: DomainOnboardingCommand,
): Promise<DomainOnboardingCommandResult> {
  try {
    switch (command.type) {
      case "start": {
        const domain = await beginDomainConnection(dependencies, command.domain);
        return { ok: true, view: buildDomainOnboardingView(domain) };
      }
      case "refresh": {
        const result = await reconcileDomain(dependencies, command.domainId);
        if (!result.domain) return { ok: false, code: "NOT_FOUND", message: "Domain not found." };
        return { ok: true, view: buildDomainOnboardingView(result.domain) };
      }
      case "make-primary": {
        await setPrimaryDomain(dependencies, command.domainId);
        const domain = await dependencies.store.getDomain(command.domainId);
        if (!domain) return { ok: false, code: "NOT_FOUND", message: "Domain not found." };
        return { ok: true, view: buildDomainOnboardingView({ ...domain, primary: true }) };
      }
      case "disconnect": {
        const domain = await disconnectDomain(dependencies, command.domainId);
        return { ok: true, view: buildDomainOnboardingView(domain) };
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Domain operation failed.";
    const stateError = /only|must|before|cannot|move the canonical/i.test(message);
    return { ok: false, code: stateError ? "INVALID_STATE" : "PROVIDER_ERROR", message };
  }
}
