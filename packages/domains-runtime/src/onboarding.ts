import { ownershipRecordName } from "./cloudflare";
import type { DomainRecord } from "./types";

export type DomainOnboardingStep =
  | "verify-ownership"
  | "update-nameservers"
  | "waiting-dns"
  | "waiting-ssl"
  | "connected"
  | "needs-attention"
  | "disconnected";

export type DomainOnboardingInstruction = {
  title: string;
  body: string;
  copyValues?: Array<{ label: string; value: string }>;
};

export type DomainOnboardingView = {
  domainId: string;
  hostname: string;
  primary: boolean;
  step: DomainOnboardingStep;
  progress: number;
  statusLabel: string;
  statusDetail: string;
  instructions: DomainOnboardingInstruction[];
  ssl: "pending" | "active" | "failed";
  canMakePrimary: boolean;
  canDisconnect: boolean;
  lastCheckedAt?: string;
  error?: string;
};

export function buildDomainOnboardingView(domain: DomainRecord): DomainOnboardingView {
  const base = {
    domainId: domain.id,
    hostname: domain.hostname,
    primary: domain.primary,
    ssl: domain.sslStatus,
    canMakePrimary: domain.status === "active" && domain.sslStatus === "active" && !domain.primary,
    canDisconnect: !domain.primary && domain.status !== "disconnecting",
    ...(domain.lastCheckedAt ? { lastCheckedAt: domain.lastCheckedAt } : {}),
    ...(domain.lastError ? { error: domain.lastError } : {}),
  } as const;

  if (domain.status === "disconnected") {
    return {
      ...base,
      step: "disconnected",
      progress: 0,
      statusLabel: "Disconnected",
      statusDetail: "This domain is no longer connected to MiCirql.",
      instructions: [],
    };
  }

  if (domain.status === "failed" || domain.status === "degraded") {
    return {
      ...base,
      step: "needs-attention",
      progress: domain.status === "degraded" ? 90 : 35,
      statusLabel: domain.status === "degraded" ? "Connection degraded" : "Action needed",
      statusDetail: domain.lastError ?? "MiCirql could not complete domain setup.",
      instructions: [{
        title: "Check your DNS settings",
        body: "Keep the DNS values shown by MiCirql unchanged, then allow time for DNS and SSL to update automatically.",
      }],
    };
  }

  if (domain.mode !== "micirql-subdomain" && ["pending", "ownership_verifying"].includes(domain.status)) {
    const token = domain.ownershipToken ?? "";
    return {
      ...base,
      step: "verify-ownership",
      progress: 15,
      statusLabel: "Verify domain ownership",
      statusDetail: "Add one TXT record at your current DNS provider. MiCirql will detect it automatically.",
      instructions: [{
        title: "Add this TXT record",
        body: "Do not remove existing DNS records. Add this verification record only.",
        copyValues: [
          { label: "Type", value: "TXT" },
          { label: "Name", value: ownershipRecordName(domain.hostname) },
          { label: "Value", value: token },
        ],
      }],
    };
  }

  if (domain.mode === "managed-dns" && ["ownership_verified", "delegation_pending"].includes(domain.status)) {
    return {
      ...base,
      step: "update-nameservers",
      progress: 45,
      statusLabel: "Point your domain to MiCirql",
      statusDetail: "Replace the domain's current nameservers at your registrar with the MiCirql nameservers below.",
      instructions: [{
        title: "Replace nameservers at your registrar",
        body: "Change nameservers only. Do not delete your domain registration. MiCirql will detect the change automatically.",
        copyValues: (domain.expectedNameservers ?? []).map((value, index) => ({
          label: `Nameserver ${index + 1}`,
          value,
        })),
      }],
    };
  }

  if (["delegated", "zone_provisioned"].includes(domain.status)) {
    return {
      ...base,
      step: "waiting-dns",
      progress: 65,
      statusLabel: "DNS is connecting",
      statusDetail: "Your domain is pointed correctly. MiCirql is finishing DNS setup automatically.",
      instructions: [{ title: "No action needed", body: "Keep the nameservers unchanged while setup completes." }],
    };
  }

  if (domain.status === "ssl_pending") {
    return {
      ...base,
      step: "waiting-ssl",
      progress: 85,
      statusLabel: "Securing your website",
      statusDetail: "DNS is ready. MiCirql is waiting for HTTPS/SSL to become active.",
      instructions: [{ title: "No action needed", body: "SSL is provisioned automatically. Your site will connect when it is ready." }],
    };
  }

  if (domain.status === "active") {
    return {
      ...base,
      step: "connected",
      progress: 100,
      statusLabel: "Connected",
      statusDetail: domain.primary
        ? "This is your website's primary domain."
        : "This domain is connected securely and can be made primary.",
      instructions: [],
    };
  }

  return {
    ...base,
    step: "waiting-dns",
    progress: 30,
    statusLabel: "Connecting",
    statusDetail: "MiCirql is checking your domain automatically.",
    instructions: [],
  };
}
