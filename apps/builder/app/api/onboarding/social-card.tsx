import { ImageResponse } from "next/og";
import type { Site } from "@micirql/schema";

const WIDTH = 1200;
const HEIGHT = 630;

export async function generateAndUploadSocialCard(input: {
  site: Site;
  supabaseUrl: string;
  supabaseKey: string;
  authorization: string;
}) {
  const brand = input.site.theme.brand;
  const colors = brand.colors;
  const description = input.site.pages[0]?.seo.description ?? "";
  const logoUrl = brand.logoAssetId;
  const background = validHex(colors.background) ? colors.background : "#0B0B0F";
  const surface = validHex(colors.surface) ? colors.surface : "#16161D";
  const primary = validHex(colors.primary) ? colors.primary : "#6D5EF5";
  const accent = validHex(colors.accent) ? colors.accent : primary;
  const text = validHex(colors.textPrimary) ? colors.textPrimary : contrastFor(background);
  const muted = validHex(colors.textSecondary) ? colors.textSecondary : text;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background,
          color: text,
          fontFamily: "Arial, Helvetica, sans-serif",
          padding: "72px 82px",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 430,
            height: 430,
            borderRadius: 999,
            right: -110,
            top: -160,
            background: primary,
            opacity: 0.22,
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 320,
            height: 320,
            borderRadius: 999,
            right: 160,
            bottom: -190,
            background: accent,
            opacity: 0.16,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 82,
            right: 82,
            top: 72,
            bottom: 72,
            borderRadius: 34,
            border: `1px solid ${withAlpha(text, 0.13)}`,
            background: withAlpha(surface, 0.58),
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            zIndex: 2,
            padding: "44px 50px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", height: 118 }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                width="320"
                height="110"
                style={{ objectFit: "contain", objectPosition: "left center", maxWidth: 320, maxHeight: 110 }}
              />
            ) : (
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 22,
                  background: primary,
                  color: contrastFor(primary),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 46,
                  fontWeight: 800,
                }}
              >
                {initialFor(input.site.name)}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 860 }}>
            <div style={{ fontSize: fitTitleSize(input.site.name), lineHeight: 1.02, fontWeight: 800, letterSpacing: -2.2 }}>
              {truncate(input.site.name, 58)}
            </div>
            {description ? (
              <div style={{ fontSize: 29, lineHeight: 1.35, color: muted, maxWidth: 900 }}>
                {truncate(description, 132)}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: muted }}>
            <div style={{ width: 42, height: 5, borderRadius: 99, background: accent }} />
            <span>{input.site.domain.replace(/-/g, " ")}</span>
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );

  if (!response.ok) throw new Error(`Social card render failed (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error("Generated social card PNG is invalid or too large.");

  const path = `${input.site.workspaceId}/${input.site.siteId}/branding/social-card-${crypto.randomUUID()}.png`;
  const upload = await fetch(`${input.supabaseUrl}/storage/v1/object/public-assets/${encodePath(path)}`, {
    method: "POST",
    headers: {
      apikey: input.supabaseKey,
      authorization: input.authorization,
      "content-type": "image/png",
      "x-upsert": "false",
    },
    body: bytes,
    cache: "no-store",
  });
  if (!upload.ok) {
    const detail = await upload.text();
    throw new Error(detail || `Social card upload failed (${upload.status}).`);
  }

  return {
    path,
    url: `${input.supabaseUrl}/storage/v1/object/public/public-assets/${encodePath(path)}`,
    width: WIDTH,
    height: HEIGHT,
    contentType: "image/png" as const,
  };
}

function validHex(value: string) { return /^#[0-9a-f]{6}$/i.test(value); }
function encodePath(path: string) { return path.split("/").map(encodeURIComponent).join("/"); }
function truncate(value: string, max: number) { const clean = value.trim().replace(/\s+/g, " "); return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`; }
function initialFor(value: string) { return value.trim().match(/[\p{L}\p{N}]/u)?.[0]?.toUpperCase() ?? "M"; }
function fitTitleSize(value: string) { const length = value.trim().length; return length > 42 ? 52 : length > 26 ? 60 : 70; }
function contrastFor(color: string) {
  if (!validHex(color)) return "#FFFFFF";
  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.58 ? "#111111" : "#FFFFFF";
}
function withAlpha(color: string, alpha: number) {
  if (!validHex(color)) return `rgba(255,255,255,${alpha})`;
  const hex = color.slice(1);
  return `rgba(${parseInt(hex.slice(0,2),16)},${parseInt(hex.slice(2,4),16)},${parseInt(hex.slice(4,6),16)},${alpha})`;
}
