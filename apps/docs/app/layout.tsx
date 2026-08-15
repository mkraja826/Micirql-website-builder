import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MiCirql Library Docs",
  description: "Internal documentation for MiCirql design and function registries"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
