import type { Domain } from "@micirql/schema";
import { domainPackSchema, type DomainPack } from "./types";
import { domainPacks as rawDomainPacks } from "./packs";

export * from "./types";
export { rawDomainPacks as domainPacks };

const validatedDomainPacks = rawDomainPacks.map((pack) => domainPackSchema.parse(pack));
const domainPackMap = new Map<Domain, DomainPack>(validatedDomainPacks.map((pack) => [pack.domain, pack]));

export function getDomainPack(domain: Domain): DomainPack {
  const pack = domainPackMap.get(domain);
  if (!pack) throw new Error(`No domain pack registered for ${domain}.`);
  return pack;
}

export function listDomainPacks(): DomainPack[] {
  return [...validatedDomainPacks];
}

export function requiredPagesForDomain(domain: Domain) {
  return getDomainPack(domain).defaultPages.filter((page) => page.required);
}

export function requiredActionsForDomain(domain: Domain): string[] {
  return [...getDomainPack(domain).requiredActions];
}
