import {
  listCertifiedIndustryPacks,
  resolveCertifiedIndustryPack,
  resolveCertifiedIndustryPackByCandidateId,
  resolveCertifiedIndustryPackByCatalogVersion,
  resolveCertifiedIndustryPackById,
  resolveCertifiedIndustryPackForSite,
} from "../registry";
import type { IndustryPackProfile, IndustryPackSiteIdentity } from "../types";
import { dentalIndustryPackRuntime } from "./dental";
import { physiotherapyIndustryPackRuntime } from "./physiotherapy";

const CERTIFIED_INDUSTRY_PACK_RUNTIMES = [
  dentalIndustryPackRuntime,
  physiotherapyIndustryPackRuntime,
] as const;

export type RegisteredIndustryPackRuntime =
  (typeof CERTIFIED_INDUSTRY_PACK_RUNTIMES)[number];

function assertRuntimeRegistryIntegrity() {
  const packs = listCertifiedIndustryPacks();
  const runtimePackIds = CERTIFIED_INDUSTRY_PACK_RUNTIMES.map(
    (runtime) => runtime.pack.id,
  );
  if (new Set(runtimePackIds).size !== runtimePackIds.length) {
    throw new Error(
      "Industry pack runtime registry contains a duplicate pack ID.",
    );
  }
  if (
    packs.length !== CERTIFIED_INDUSTRY_PACK_RUNTIMES.length ||
    packs.some((pack) => !runtimePackIds.includes(pack.id))
  ) {
    throw new Error(
      "Every certified industry pack must have exactly one registered runtime.",
    );
  }
  for (const runtime of CERTIFIED_INDUSTRY_PACK_RUNTIMES) {
    const pack = resolveCertifiedIndustryPackById(runtime.pack.id);
    if (
      pack !== runtime.pack ||
      runtime.pack.catalogVersion !== pack.catalogVersion
    ) {
      throw new Error(
        `Runtime ${runtime.pack.id} is not attached to its certified pack identity.`,
      );
    }
    const packCandidateIds = runtime.pack
      .listCandidates()
      .map((candidate) => candidate.id);
    const runtimeCandidateIds = runtime
      .listCandidates()
      .map((candidate) => candidate.id);
    if (
      packCandidateIds.length !== runtimeCandidateIds.length ||
      packCandidateIds.some(
        (candidateId, index) => candidateId !== runtimeCandidateIds[index],
      )
    ) {
      throw new Error(
        `Runtime ${runtime.pack.id} does not expose its certified candidate catalog unchanged.`,
      );
    }
  }
}

assertRuntimeRegistryIntegrity();

export function listCertifiedIndustryPackRuntimes(): RegisteredIndustryPackRuntime[] {
  return [...CERTIFIED_INDUSTRY_PACK_RUNTIMES];
}

export function resolveCertifiedIndustryPackRuntimeById(
  packId: unknown,
): RegisteredIndustryPackRuntime | undefined {
  const pack = resolveCertifiedIndustryPackById(packId);
  return pack ? runtimeForPackId(pack.id) : undefined;
}

export function resolveCertifiedIndustryPackRuntime(
  profile: IndustryPackProfile,
): RegisteredIndustryPackRuntime | undefined {
  const pack = resolveCertifiedIndustryPack(profile);
  return pack ? runtimeForPackId(pack.id) : undefined;
}

export function resolveCertifiedIndustryPackRuntimeForSite(
  site: IndustryPackSiteIdentity,
): RegisteredIndustryPackRuntime | undefined {
  const pack = resolveCertifiedIndustryPackForSite(site);
  return pack ? runtimeForPackId(pack.id) : undefined;
}

export function resolveCertifiedIndustryPackRuntimeByCatalogVersion(
  catalogVersion: unknown,
): RegisteredIndustryPackRuntime | undefined {
  const pack = resolveCertifiedIndustryPackByCatalogVersion(catalogVersion);
  return pack ? runtimeForPackId(pack.id) : undefined;
}

export function resolveCertifiedIndustryPackRuntimeByCandidateId(
  candidateId: unknown,
): RegisteredIndustryPackRuntime | undefined {
  const pack = resolveCertifiedIndustryPackByCandidateId(candidateId);
  return pack ? runtimeForPackId(pack.id) : undefined;
}

function runtimeForPackId(
  packId: string,
): RegisteredIndustryPackRuntime | undefined {
  return CERTIFIED_INDUSTRY_PACK_RUNTIMES.find(
    (runtime) => runtime.pack.id === packId,
  );
}
