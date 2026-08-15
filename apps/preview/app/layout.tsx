import type { Metadata } from "next";
import "@micirql/primitives/styles.css";
import "@micirql/components/styles.css";
import "@micirql/sections/styles.css";

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
