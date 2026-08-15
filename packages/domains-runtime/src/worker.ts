import { reconcileDomain } from "./orchestrator";
import type { DomainEngineDependencies } from "./types";

export type DomainWorkItem = {
  domainId: string;
};

export type DomainWorkResult = {
  domainId: string;
  ok: boolean;
  retryAfterSeconds?: number;
  error?: string;
};

export async function processDomainWorkBatch(
  dependencies: DomainEngineDependencies,
  items: DomainWorkItem[],
): Promise<DomainWorkResult[]> {
  const results: DomainWorkResult[] = [];
  for (const item of items) {
    try {
      const reconciled = await reconcileDomain(dependencies, item.domainId);
      results.push(
        reconciled.retryAfterSeconds === undefined
          ? { domainId: item.domainId, ok: true }
          : { domainId: item.domainId, ok: true, retryAfterSeconds: reconciled.retryAfterSeconds },
      );
    } catch (error) {
      results.push({
        domainId: item.domainId,
        ok: false,
        retryAfterSeconds: 300,
        error: error instanceof Error ? error.message : "Unknown domain reconciliation error.",
      });
    }
  }
  return results;
}
