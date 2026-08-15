import type { DelegationVerifier, DomainProvider, OwnershipVerifier } from "./types";

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";
const CLOUDFLARE_DOH = "https://cloudflare-dns.com/dns-query";

export type CloudflareDomainProviderConfig = {
  apiToken: string;
  accountId?: string;
  originTarget: string;
  fetch?: typeof globalThis.fetch;
};

type CloudflareEnvelope<T> = {
  success: boolean;
  result: T;
  errors?: Array<{ code?: number; message?: string }>;
};

type CloudflareZone = {
  id: string;
  name: string;
  name_servers?: string[];
  status?: string;
};

type CloudflareDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
};

type CloudflareCertificatePack = {
  status: string;
  hosts?: string[];
};

type DohAnswer = { name: string; type: number; data: string };
type DohResponse = { Status: number; Answer?: DohAnswer[] };

export function createCloudflareDomainProvider(config: CloudflareDomainProviderConfig): DomainProvider {
  const request = createCloudflareRequest(config);
  const fetcher = config.fetch ?? globalThis.fetch;

  return {
    async createZone({ hostname }) {
      const zoneName = normalizeHostname(hostname);
      const existing = await findZone(request, zoneName);
      const zone = existing ?? await request<CloudflareZone>("/zones", {
        method: "POST",
        body: JSON.stringify({
          name: zoneName,
          type: "full",
          ...(config.accountId ? { account: { id: config.accountId } } : {}),
        }),
      });

      return {
        zoneId: zone.id,
        nameservers: (zone.name_servers ?? []).map(normalizeDnsName),
      };
    },

    async deleteZone({ zoneId }) {
      await request<unknown>(`/zones/${encodeURIComponent(zoneId)}`, { method: "DELETE" });
    },

    async ensureOriginRecords({ zoneId, hostname }) {
      await ensureCnameRecord({
        request,
        zoneId,
        name: normalizeHostname(hostname),
        target: normalizeHostname(config.originTarget),
      });
    },

    async checkSsl({ hostname }) {
      const zone = await findZone(request, normalizeHostname(hostname));
      if (!zone) return "pending";
      if (zone.status && zone.status !== "active") return "pending";

      const packs = await request<CloudflareCertificatePack[]>(
        `/zones/${encodeURIComponent(zone.id)}/ssl/certificate_packs?deploy=production`,
      );
      const relevant = packs.filter((pack) => (pack.hosts ?? []).some((host) => hostnameMatches(host, hostname)));
      if (relevant.some((pack) => pack.status === "active" || pack.status === "staging_active")) return "active";
      if (relevant.length > 0 && relevant.every((pack) => isTerminalCertificateFailure(pack.status))) return "failed";

      // A newly activated Cloudflare zone may not expose its Universal SSL pack immediately.
      // Keep the lifecycle pending rather than falsely failing the domain.
      return "pending";
    },
  };
}

export function createCloudflareOwnershipVerifier(args?: {
  fetch?: typeof globalThis.fetch;
  recordName?: (hostname: string) => string;
}): OwnershipVerifier {
  const fetcher = args?.fetch ?? globalThis.fetch;
  return {
    async verifyTxt({ hostname, token }) {
      const recordName = args?.recordName?.(hostname) ?? ownershipRecordName(hostname);
      const answers = await dohQuery(fetcher, recordName, "TXT");
      return answers.some((answer) => stripTxtQuotes(answer.data) === token);
    },
  };
}

export function createCloudflareDelegationVerifier(args?: {
  fetch?: typeof globalThis.fetch;
}): DelegationVerifier {
  const fetcher = args?.fetch ?? globalThis.fetch;
  return {
    async nameserversFor(hostname) {
      const answers = await dohQuery(fetcher, normalizeHostname(hostname), "NS");
      return answers.map((answer) => normalizeDnsName(answer.data));
    },
  };
}

export function ownershipRecordName(hostname: string): string {
  return `_micirql-verification.${normalizeHostname(hostname)}`;
}

function createCloudflareRequest(config: CloudflareDomainProviderConfig) {
  const fetcher = config.fetch ?? globalThis.fetch;
  if (!config.apiToken.trim()) throw new Error("Cloudflare API token is required.");

  return async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(`${CLOUDFLARE_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const payload = await response.json() as CloudflareEnvelope<T>;
    if (!response.ok || !payload.success) {
      const message = payload.errors?.map((error) => error.message ?? `Cloudflare error ${error.code ?? "unknown"}`).join("; ")
        || `Cloudflare API request failed with HTTP ${response.status}.`;
      throw new Error(message);
    }
    return payload.result;
  };
}

async function findZone(
  request: <T>(path: string, init?: RequestInit) => Promise<T>,
  hostname: string,
): Promise<CloudflareZone | undefined> {
  const zones = await request<CloudflareZone[]>(`/zones?name=${encodeURIComponent(hostname)}&status=active,pending`);
  return zones.find((zone) => normalizeHostname(zone.name) === normalizeHostname(hostname));
}

async function ensureCnameRecord(args: {
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  zoneId: string;
  name: string;
  target: string;
}): Promise<void> {
  const base = `/zones/${encodeURIComponent(args.zoneId)}/dns_records`;
  const existing = await args.request<CloudflareDnsRecord[]>(`${base}?name=${encodeURIComponent(args.name)}`);
  const conflicts = existing.filter((record) => ["A", "AAAA", "CNAME"].includes(record.type));
  const cname = conflicts.find((record) => record.type === "CNAME");

  if (conflicts.some((record) => record.type !== "CNAME")) {
    throw new Error(`Cannot provision ${args.name}: conflicting A/AAAA record already exists.`);
  }

  const body = JSON.stringify({
    type: "CNAME",
    name: args.name,
    content: args.target,
    ttl: 1,
    proxied: true,
    comment: "Managed by MiCirql",
  });

  if (cname) {
    if (normalizeHostname(cname.content) === args.target && cname.proxied === true) return;
    await args.request<CloudflareDnsRecord>(`${base}/${encodeURIComponent(cname.id)}`, { method: "PUT", body });
    return;
  }

  await args.request<CloudflareDnsRecord>(base, { method: "POST", body });
}

async function dohQuery(fetcher: typeof globalThis.fetch, name: string, type: "TXT" | "NS"): Promise<DohAnswer[]> {
  const url = `${CLOUDFLARE_DOH}?name=${encodeURIComponent(name)}&type=${type}`;
  const response = await fetcher(url, { headers: { Accept: "application/dns-json" } });
  if (!response.ok) throw new Error(`DNS verification failed with HTTP ${response.status}.`);
  const payload = await response.json() as DohResponse;
  if (payload.Status !== 0) return [];
  return payload.Answer ?? [];
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.$/, "").replace(/\/$/, "");
}

function normalizeDnsName(value: string): string {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function stripTxtQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1).replace(/"\s+"/g, "");
  return trimmed;
}

function hostnameMatches(certificateHost: string, hostname: string): boolean {
  const cert = normalizeHostname(certificateHost);
  const target = normalizeHostname(hostname);
  if (cert === target) return true;
  if (!cert.startsWith("*.")) return false;
  const suffix = cert.slice(1);
  return target.endsWith(suffix) && target.split(".").length === cert.split(".").length;
}

function isTerminalCertificateFailure(status: string): boolean {
  return [
    "deleted",
    "expired",
    "inactive",
    "initializing_timed_out",
    "validation_timed_out",
    "issuance_timed_out",
    "deployment_timed_out",
    "deletion_timed_out",
  ].includes(status);
}
