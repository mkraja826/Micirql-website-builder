import type { Metadata } from "next";
import "@micirql/primitives/styles.css";
import "@micirql/components/styles.css";
import "@micirql/sections/styles.css";
import "@micirql/sections/shell-styles.css";
import "@micirql/sections/content-sections.css";
import "@micirql/sections/conversion-styles.css";
import "@micirql/sections/media-sections.css";
import "@micirql/sections/gallery-lightbox.css";
import "@micirql/sections/faq-accordion.css";
import "@micirql/sections/palette-runtime.css";
import "@micirql/sections/image-slots.css";
import "@micirql/sections/premium-mobile.css";
import "@micirql/sections/premium-output-system.css";
import "@micirql/sections/premium-geometry.css";

export const metadata: Metadata = {
  title: "MiCirql Preview",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "var(--mi-color-surface)", color: "var(--mi-color-text)" }}>{children}</body>
    </html>
  );
}
