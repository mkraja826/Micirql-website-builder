import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { SeedSection, seedSectionCatalog } from "@micirql/sections";
import { resolveTheme } from "@micirql/themes";
import { sectionPreviewProps } from "../../../lib/sample-section";

const previewBrand = {
  primary: "#5b21b6",
  primaryContrast: "#ffffff",
  secondary: "#f3f4f6",
  secondaryContrast: "#111827",
  accent: "#7c3aed",
  accentContrast: "#ffffff",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",
  text: "#111827",
  textMuted: "#5f6570",
  border: "#d7dae0",
  danger: "#b91c1c",
  success: "#15803d",
  warning: "#a16207",
};

export function generateStaticParams() {
  return seedSectionCatalog.map((entry) => ({ designId: entry.id }));
}

export default async function DesignPreviewPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  const entry = seedSectionCatalog.find((item) => item.id === designId);
  if (!entry) notFound();

  const theme = resolveTheme({
    family: entry.theme,
    modifiers: [],
    colors: previewBrand,
    typography: {
      display: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      body: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
  });

  return (
    <main
      data-mi-preview-id={entry.id}
      data-mi-theme={entry.theme}
      data-mi-family={entry.family}
      style={theme.cssVariables as CSSProperties}
    >
      <SeedSection family={entry.family} variant={entry.variant} props={sectionPreviewProps} />
    </main>
  );
}
