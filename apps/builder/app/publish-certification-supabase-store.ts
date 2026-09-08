import type { NextRequest } from "next/server";
import type { FullStackPublishCertificationReceipt, FullStackPublishCertificationStore } from "./publish-full-stack-certification";
import type { RenderedVisualCertificationReceipt, RenderedVisualCertificationStore } from "./publishable-draft-certification";
import { supabaseConfig, supabaseTrustedHeaders } from "./api/drafts/supabase-store";

type ReceiptRow = {
  receipt: unknown;
};

export function createSupabaseRenderedVisualCertificationStore(request: NextRequest): RenderedVisualCertificationStore {
  return {
    async find(args) {
      const receipt = await findReceipt(request, args.siteId, args.draftFingerprint, "rendered-visual");
      return receipt as RenderedVisualCertificationReceipt | undefined;
    },
  };
}

export function createSupabaseFullStackCertificationStore(request: NextRequest): FullStackPublishCertificationStore {
  return {
    async find(args) {
      const receipt = await findReceipt(request, args.siteId, args.draftFingerprint, "full-stack");
      return receipt as FullStackPublishCertificationReceipt | undefined;
    },
  };
}

async function findReceipt(
  request: NextRequest,
  siteId: string,
  draftFingerprint: string,
  certificationType: "rendered-visual" | "full-stack",
) {
  const cfg = supabaseConfig();
  const query = new URLSearchParams({
    site_id: `eq.${siteId}`,
    draft_fingerprint: `eq.${draftFingerprint}`,
    certification_type: `eq.${certificationType}`,
    select: "receipt",
    limit: "1",
  });
  const response = await fetch(`${cfg.url}/rest/v1/publish_certification_receipts?${query}`, {
    headers: supabaseTrustedHeaders(request),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Publish certification receipt lookup failed (${response.status}).`);
  const rows = await response.json() as ReceiptRow[];
  return rows[0]?.receipt;
}
