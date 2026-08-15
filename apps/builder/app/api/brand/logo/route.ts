import { NextRequest, NextResponse } from "next/server";
import { supabaseConfig, bearerToken } from "../../drafts/supabase-store";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      workspaceId?: string;
      siteId?: string;
      fileName?: string;
      contentType?: string;
      dataUrl?: string;
    };

    const workspaceId = clean(body.workspaceId);
    const siteId = clean(body.siteId);
    const fileName = clean(body.fileName);
    const contentType = clean(body.contentType);
    const dataUrl = clean(body.dataUrl);
    if (!workspaceId || !siteId || !fileName || !contentType || !dataUrl) {
      return NextResponse.json({ error: "workspaceId, siteId, fileName, contentType and dataUrl are required." }, { status: 400 });
    }
    if (!ALLOWED.has(contentType)) return NextResponse.json({ error: "Unsupported logo format." }, { status: 415 });

    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    const detectedType = match?.[1];
    const encoded = match?.[2];
    if (!detectedType || !encoded || detectedType !== contentType) {
      return NextResponse.json({ error: "Invalid logo image data." }, { status: 400 });
    }
    const bytes = Buffer.from(encoded, "base64");
    if (!bytes.length || bytes.length > MAX_BYTES) return NextResponse.json({ error: "Logo must be smaller than 5 MB." }, { status: 413 });

    const { url, key } = supabaseConfig();
    const token = bearerToken(request);
    const ext = extension(contentType);
    const path = `${workspaceId}/${siteId}/branding/logo-${crypto.randomUUID()}.${ext}`;
    const objectUrl = `${url}/storage/v1/object/public-assets/${encodePath(path)}`;
    const upload = await fetch(objectUrl, {
      method: "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${token}`,
        "content-type": contentType,
        "x-upsert": "false",
      },
      body: Uint8Array.from(bytes),
      cache: "no-store",
    });
    if (!upload.ok) {
      const detail = await upload.text();
      return NextResponse.json({ error: detail || `Logo upload failed (${upload.status}).` }, { status: upload.status });
    }

    const publicUrl = `${url}/storage/v1/object/public/public-assets/${encodePath(path)}`;
    return NextResponse.json({ ok: true, path, url: publicUrl }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Logo upload failed." }, { status: 500 });
  }
}

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function encodePath(path: string) { return path.split("/").map(encodeURIComponent).join("/"); }
function extension(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/svg+xml") return "svg";
  return type.split("/")[1] || "png";
}
