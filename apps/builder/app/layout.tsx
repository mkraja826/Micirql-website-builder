import type { Metadata } from "next";
import "./globals.css";
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
