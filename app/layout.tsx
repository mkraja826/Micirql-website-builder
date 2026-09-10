import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pearl Dental Benchmark | MiCirql",
  description: "Manual benchmark for MiCirql complete-section quality.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
