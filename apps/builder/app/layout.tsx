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
import "@micirql/sections/premium-mobile.css";
import "@micirql/sections/dental-layout-blueprints.css";
import "@micirql/sections/dental-02-implant-atelier.css";
import "@micirql/sections/dental-03-smile-studio.css";
import "@micirql/sections/dental-04-family-care.css";
import "@micirql/sections/dental-05-digital-dentistry.css";
import "@micirql/sections/dental-06-doctor-signature.css";
import "@micirql/sections/dental-07-consultation-engine.css";
import "@micirql/sections/dental-08-boutique-cosmetic.css";
import "@micirql/sections/dental-09-ortho-journey.css";
import "@micirql/sections/dental-10-immediate-care.css";
import "@micirql/sections/dental-11-dental-journal.css";
import "@micirql/sections/dental-12-calm-dentistry.css";
import "@micirql/sections/dental-13-implant-results.css";
import "@micirql/sections/dental-14-city-clinic.css";
import "@micirql/sections/dental-15-smile-campaign.css";
import "@micirql/sections/dental-16-multi-specialty-hub.css";
import "@micirql/sections/dental-17-clinic-story.css";
import "@micirql/sections/dental-18-proof-first.css";
import "@micirql/sections/dental-19-quiet-precision.css";
import "@micirql/sections/dental-20-complete-signature.css";
import "@micirql/sections/dental-responsive-safety.css";
import "@micirql/sections/premium-output-system.css";
import "@micirql/sections/premium-geometry.css";
import "@micirql/sections/dental-01-clinical-authority-refinement.css";
import "@micirql/sections/dental-04-family-care-refinement.css";
import "@micirql/sections/dental-05-digital-dentistry-refinement.css";
import "@micirql/sections/dental-07-premium-refinement.css";
import "@micirql/sections/dental-09-ortho-journey-refinement.css";
import "@micirql/sections/dental-10-immediate-care-refinement.css";
import "@micirql/sections/dental-12-calm-dentistry-refinement.css";
import "@micirql/sections/dental-13-implant-results-refinement.css";
import "@micirql/sections/dental-15-smile-campaign-refinement.css";
import "@micirql/sections/dental-16-premium-refinement.css";
import "@micirql/sections/dental-18-proof-first-refinement.css";
import "@micirql/sections/dental-19-quiet-precision-refinement.css";
import "@micirql/sections/dental-20-complete-signature-refinement.css";
import "./globals.css";
import "./editor-shell-polish.css";
import "./publish-readiness-polish.css";
import "./publish-review.css";
import "./publish-review-state.css";
import "./auth.css";
import "./workspace-interactive.css";
import "./canvas-controls.css";
import "./completion-checklist.css";
import "./actionable-checklist.css";
import "./editor-layout-guard.css";
import "./editor-premium-responsive.css";
import "./editor-mode-polish.css";
import "./editor-adaptive-breakpoints.css";
import "./auth-signout-position.css";
import "./mobile-layout-hardening.css";

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
