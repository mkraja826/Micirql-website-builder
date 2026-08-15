"use client";

import type { ThemeConfig } from "@micirql/schema";
import type { SectionFamily, SectionVariant } from "@micirql/sections";

export type IndustryDesignPreset = {
  id: string;
  name: string;
  description: string;
  theme: ThemeConfig;
  variants: Partial<Record<SectionFamily, SectionVariant>>;
};

const baseColors = {
  success: "#168a4a",
  warning: "#ad6a00",
  error: "#c93636",
};

export const INDUSTRY_DESIGN_PRESETS: IndustryDesignPreset[] = [
  {
    id: "dental-clinic",
    name: "Dental Clinic",
    description: "Clean, reassuring and conversion-focused for general dentistry.",
    theme: {
      family: "minimalist",
      modifiers: ["light", "rounded", "photography-led"],
      brand: {
        colors: { primary: "#0f766e", secondary: "#164e63", accent: "#14b8a6", background: "#f8fffe", surface: "#edf9f7", textPrimary: "#102a2a", textSecondary: "#527070", border: "#cfe3df", ...baseColors },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "soft",
        motion: "subtle",
      },
    },
    variants: { hero: 2, services: 3, testimonials: 2, gallery: 3, cta: 2, contact: 2 },
  },
  {
    id: "premium-implant-clinic",
    name: "Premium Implant Clinic",
    description: "High-trust, premium presentation for implant-led practices.",
    theme: {
      family: "luxury",
      modifiers: ["light", "photography-led", "motion-subtle"],
      brand: {
        colors: { primary: "#8b6b35", secondary: "#15120e", accent: "#c4a266", background: "#fffdf9", surface: "#f6f1e8", textPrimary: "#1c1812", textSecondary: "#746a5c", border: "#ded3c0", ...baseColors },
        typography: { display: "Georgia", body: "Inter", ui: "Inter" },
        density: "spacious",
        shape: "balanced",
        motion: "subtle",
      },
    },
    variants: { hero: 5, about: 4, services: 2, process: 4, testimonials: 4, gallery: 5, cta: 3, contact: 2 },
  },
  {
    id: "restaurant",
    name: "Restaurant",
    description: "Warm, image-led layouts for menus, ambience and reservations.",
    theme: {
      family: "organic",
      modifiers: ["photography-led", "texture-grain", "rounded"],
      brand: {
        colors: { primary: "#8a3d21", secondary: "#342319", accent: "#d18a4e", background: "#fffaf3", surface: "#f5eadc", textPrimary: "#2d2119", textSecondary: "#776354", border: "#dfd0be", ...baseColors },
        typography: { display: "Georgia", body: "Arial", ui: "Arial" },
        density: "comfortable",
        shape: "soft",
        motion: "standard",
      },
    },
    variants: { hero: 5, about: 2, services: 4, gallery: 5, testimonials: 3, cta: 2, contact: 3 },
  },
  {
    id: "real-estate",
    name: "Real Estate",
    description: "Editorial property presentation with strong listing imagery.",
    theme: {
      family: "editorial",
      modifiers: ["light", "photography-led", "sharp"],
      brand: {
        colors: { primary: "#25364a", secondary: "#0f1720", accent: "#b58a55", background: "#fbfaf7", surface: "#f0eee9", textPrimary: "#14191f", textSecondary: "#65707a", border: "#d8d7d2", ...baseColors },
        typography: { display: "Georgia", body: "Inter", ui: "Inter" },
        density: "spacious",
        shape: "sharp",
        motion: "subtle",
      },
    },
    variants: { hero: 4, features: 2, gallery: 5, process: 2, testimonials: 4, cta: 3, contact: 2 },
  },
  {
    id: "saas",
    name: "SaaS",
    description: "Crisp product-led presentation for software and subscriptions.",
    theme: {
      family: "futuristic",
      modifiers: ["gradient", "rounded", "motion-rich"],
      brand: {
        colors: { primary: "#6d5dfc", secondary: "#111827", accent: "#22d3ee", background: "#f8faff", surface: "#eef2ff", textPrimary: "#111827", textSecondary: "#667085", border: "#d9def2", ...baseColors },
        typography: { display: "Inter", body: "Inter", ui: "Inter" },
        density: "comfortable",
        shape: "soft",
        motion: "rich",
      },
    },
    variants: { hero: 2, features: 3, process: 2, testimonials: 2, cta: 5, contact: 1 },
  },
  {
    id: "corporate",
    name: "Corporate",
    description: "Conservative, structured and professional for established firms.",
    theme: {
      family: "corporate",
      modifiers: ["light", "sharp", "motion-subtle"],
      brand: {
        colors: { primary: "#1f4b7a", secondary: "#17212b", accent: "#4d7ba8", background: "#ffffff", surface: "#f4f6f8", textPrimary: "#17212b", textSecondary: "#687481", border: "#d9dee4", ...baseColors },
        typography: { display: "Arial", body: "Arial", ui: "Arial" },
        density: "compact",
        shape: "sharp",
        motion: "subtle",
      },
    },
    variants: { hero: 2, about: 2, services: 2, process: 1, testimonials: 1, cta: 2, contact: 1 },
  },
  {
    id: "construction",
    name: "Construction",
    description: "Strong geometric layouts for capability, projects and trust signals.",
    theme: {
      family: "maximalist",
      modifiers: ["geometric", "sharp", "photography-led"],
      brand: {
        colors: { primary: "#d97706", secondary: "#1f2937", accent: "#f59e0b", background: "#fffdf8", surface: "#f5f1e8", textPrimary: "#1c232b", textSecondary: "#69727c", border: "#d9d3c8", ...baseColors },
        typography: { display: "Arial", body: "Arial", ui: "Arial" },
        density: "comfortable",
        shape: "sharp",
        motion: "standard",
      },
    },
    variants: { hero: 5, about: 3, services: 3, process: 4, gallery: 4, testimonials: 2, cta: 4, contact: 2 },
  },
];

export function IndustryDesignPresets({ onApply }: { onApply(preset: IndustryDesignPreset): void }) {
  return <section className="industry-presets">
    <span className="theme-studio-label">Industry presets</span>
    <div className="industry-preset-grid">
      {INDUSTRY_DESIGN_PRESETS.map((preset) => <button type="button" key={preset.id} onClick={() => onApply(preset)}>
        <strong>{preset.name}</strong>
        <small>{preset.description}</small>
      </button>)}
    </div>
  </section>;
}
