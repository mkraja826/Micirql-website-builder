import type { Metadata } from "next";
import "@micirql/primitives/styles.css";
import "@micirql/components/styles.css";
import "@micirql/sections/styles.css";
import "@micirql/sections/shell-styles.css";
import "@micirql/sections/content-sections.css";
import "@micirql/sections/conversion-styles.css";
import "@micirql/sections/media-sections.css";
import "@micirql/sections/palette-runtime.css";
import "@micirql/sections/image-slots.css";
import "./globals.css";
import "./auth.css";
import "./workspace-interactive.css";
import "./canvas-controls.css";
import "./completion-checklist.css";
import "./actionable-checklist.css";

export const metadata: Metadata = {
  title: "MiCirql Builder",
  description: "AI-assisted, schema-driven website builder"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
