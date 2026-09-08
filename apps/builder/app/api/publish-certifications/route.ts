import { NextRequest } from "next/server";

const TYPES = new Set(["rendered-visual", "full-stack"]);

export async function POST(request: NextRequest) {
  try {
    const token = process.env.MICIRQL_CERTIFICATION_WRITE_TOKEN?.trim();
    const authorization = request.headers.get("authorization");
    if (!token || authorization !== `Bearer ${token}`) {
      return Response.json({ ok: false, code: "CERTIFICATION_WRITER_UNAUTHORIZED" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const serviceKey = process.env.MICIRQL_SUPABASE_SECRET_KEY?.trim()
      || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!supabaseUrl || !serviceKey) {
      return Response.json({ ok: false, code: "CERTIFICATION_STORE_NOT_CONFIGURED" }, { status: 503 });
    }

    const body = await request.json() as Record<string, unknown>;
    const certificationType = text(body.certificationType);
    const siteId = text(body.siteId);
    const draftFingerprint = text(body.draftFingerprint);
    const receipt = body.receipt;

    if (!TYPES.has(certificationType)
      || !uuid(siteId)
      || !/^[a-f0-9]{64}$/i.test(draftFingerprint)
      || !receipt
      || typeof receipt !== "object"
      || Array.isArray(receipt)) {
      return Response.json({ ok: false, code: "INVALID_CERTIFICATION_RECEIPT" }, { status: 400 });
    }

    const record = receipt as Record<string, unknown>;
    const passed = record.passed === true;
    const certifiedAt = text(record.certifiedAt);
    if (text(record.siteId) !== siteId
      || text(record.draftFingerprint) !== draftFingerprint
      || !Number.isFinite(Date.parse(certifiedAt))) {
      return Response.json({ ok: false, code: "CERTIFICATION_RECEIPT_MISMATCH" }, { status: 400 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/upsert_publish_certification_receipt`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_site_id: siteId,
        p_draft_fingerprint: draftFingerprint,
        p_certification_type: certificationType,
        p_passed: passed,
        p_certified_at: certifiedAt,
        p_receipt: receipt,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      return Response.json({ ok: false, code: "CERTIFICATION_RECEIPT_SAVE_FAILED" }, { status: 502 });
    }

    return Response.json({ ok: true, receiptId: await response.json() }, { status: 201 });
  } catch (error) {
    return Response.json({
      ok: false,
      code: "CERTIFICATION_RECEIPT_WRITE_FAILED",
      message: error instanceof Error ? error.message : "Certification receipt write failed.",
    }, { status: 500 });
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
