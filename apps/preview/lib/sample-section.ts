import type { UniversalSectionProps } from "@micirql/sections";

export const sectionPreviewProps: UniversalSectionProps = {
  eyebrow: "MiCirql verified section",
  title: "A mobile-first section built for speed and real functionality",
  description: "Deterministic preview content lets MiCirql compare layouts consistently across themes, viewports, and future releases.",
  primaryAction: { label: "Primary action", href: "#primary" },
  secondaryAction: { label: "Learn more", href: "#secondary" },
  image: {
    src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=75",
    alt: "Bright modern workspace used as a deterministic section preview",
  },
  items: [
    { title: "Clear hierarchy", description: "Content remains easy to scan on small screens." },
    { title: "Fast by default", description: "Sections reuse lightweight primitives and progressive enhancement." },
    { title: "Functional contracts", description: "Interactive behavior must bind to registered actions." },
    { title: "Accessible", description: "Keyboard, focus, labels, contrast and reduced motion are protocol requirements." },
  ],
};
