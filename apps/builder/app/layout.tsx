import type { Metadata } from "next";
import "@micirql/primitives/styles.css";
import "@micirql/components/styles.css";
import "@micirql/sections/styles.css";
import "./globals.css";
import "./auth.css";
import "./workspace-interactive.css";

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
