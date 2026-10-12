const GENERATED_SITE_HOST_SUFFIX = "-site.micirql.com";
const DNS_LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function generatedLiveHostname(siteId: string): string {
  const normalized = siteId.trim().toLowerCase();
  const label = `${normalized}-site`;
  if (!normalized || label.length > 63 || !DNS_LABEL.test(label)) {
    throw new Error(
      "Site ID cannot be represented as a generated live hostname.",
    );
  }
  return `${label}.micirql.com`;
}

export function generatedLiveSiteId(hostname: string): string | undefined {
  const normalized = hostname
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^\.+|\.+$/g, "");
  if (!normalized.endsWith(GENERATED_SITE_HOST_SUFFIX)) return undefined;
  const siteId = normalized.slice(0, -GENERATED_SITE_HOST_SUFFIX.length);
  const label = `${siteId}-site`;
  return siteId && label.length <= 63 && DNS_LABEL.test(label)
    ? siteId
    : undefined;
}

export function liveResolverHostname(hostname: string): string {
  const generatedSiteId = generatedLiveSiteId(hostname);
  return generatedSiteId ? `${generatedSiteId}.micirql.com` : hostname;
}
