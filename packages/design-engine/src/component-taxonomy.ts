export type ComponentTier = "shell" | "conversion" | "content" | "proof" | "media" | "commerce" | "utility";

export type ComponentTarget = {
  family: string;
  tier: ComponentTier;
  v1Target: number;
  minimumBeforeQualityTest: number;
  requiredCapabilities: string[];
  archetypes: string[];
};

/**
 * Counts below mean genuinely distinct structures, not theme recolors.
 * A component only counts toward coverage if its DOM/layout behavior is materially different.
 */
export const V1_COMPONENT_TARGETS: ComponentTarget[] = [
  { family: "navbar", tier: "shell", v1Target: 16, minimumBeforeQualityTest: 8, requiredCapabilities: ["desktop-nav", "mobile-burger", "logo", "primary-cta", "keyboard-nav"], archetypes: ["all"] },
  { family: "footer", tier: "shell", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["responsive-links", "legal-links", "brand-area"], archetypes: ["all"] },
  { family: "hero", tier: "conversion", v1Target: 24, minimumBeforeQualityTest: 12, requiredCapabilities: ["headline", "supporting-copy", "primary-cta", "responsive-layout"], archetypes: ["all"] },
  { family: "services", tier: "content", v1Target: 18, minimumBeforeQualityTest: 8, requiredCapabilities: ["items", "responsive-grid"], archetypes: ["local-service", "professional-services", "healthcare-clinic", "corporate-company"] },
  { family: "features", tier: "content", v1Target: 16, minimumBeforeQualityTest: 8, requiredCapabilities: ["items", "icons-or-media"], archetypes: ["saas-technology", "corporate-company", "ecommerce"] },
  { family: "about", tier: "content", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["narrative", "media"], archetypes: ["all"] },
  { family: "process", tier: "content", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["steps", "ordered-flow"], archetypes: ["local-service", "professional-services", "healthcare-clinic", "education-training", "corporate-company"] },
  { family: "testimonials", tier: "proof", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["quote", "attribution"], archetypes: ["all"] },
  { family: "proof", tier: "proof", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["stats-or-logos-or-credentials"], archetypes: ["professional-services", "healthcare-clinic", "saas-technology", "corporate-company"] },
  { family: "case-studies", tier: "proof", v1Target: 10, minimumBeforeQualityTest: 4, requiredCapabilities: ["result-summary", "detail-link"], archetypes: ["professional-services", "saas-technology", "corporate-company"] },
  { family: "gallery", tier: "media", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["responsive-media", "image-alt"], archetypes: ["healthcare-clinic", "hospitality", "portfolio-creative", "local-service"] },
  { family: "portfolio", tier: "media", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["project-grid", "project-detail-link"], archetypes: ["portfolio-creative", "professional-services", "corporate-company"] },
  { family: "team", tier: "content", v1Target: 10, minimumBeforeQualityTest: 5, requiredCapabilities: ["person-card", "role"], archetypes: ["professional-services", "healthcare-clinic", "education-training", "corporate-company"] },
  { family: "cta", tier: "conversion", v1Target: 14, minimumBeforeQualityTest: 7, requiredCapabilities: ["primary-action", "responsive-layout"], archetypes: ["all"] },
  { family: "contact", tier: "conversion", v1Target: 12, minimumBeforeQualityTest: 6, requiredCapabilities: ["contact-details", "form-or-action", "mobile-safe-inputs"], archetypes: ["all"] },
  { family: "faq", tier: "content", v1Target: 8, minimumBeforeQualityTest: 4, requiredCapabilities: ["accordion", "keyboard-accessible"], archetypes: ["all"] },
  { family: "pricing", tier: "conversion", v1Target: 10, minimumBeforeQualityTest: 4, requiredCapabilities: ["plan-comparison", "cta"], archetypes: ["saas-technology", "education-training", "ecommerce"] },
  { family: "product-grid", tier: "commerce", v1Target: 10, minimumBeforeQualityTest: 4, requiredCapabilities: ["products", "responsive-grid"], archetypes: ["ecommerce"] },
  { family: "listings", tier: "commerce", v1Target: 10, minimumBeforeQualityTest: 4, requiredCapabilities: ["listing-card", "filters-ready"], archetypes: ["real-estate"] },
  { family: "blog-list", tier: "content", v1Target: 8, minimumBeforeQualityTest: 4, requiredCapabilities: ["article-card", "pagination-ready"], archetypes: ["professional-services", "healthcare-clinic", "saas-technology", "education-training", "corporate-company"] },
];

export const V1_TOTAL_DISTINCT_COMPONENT_TARGET = V1_COMPONENT_TARGETS.reduce((sum, item) => sum + item.v1Target, 0);
export const QUALITY_TEST_MINIMUM_DISTINCT_COMPONENTS = V1_COMPONENT_TARGETS.reduce((sum, item) => sum + item.minimumBeforeQualityTest, 0);

export const COMPONENT_QUALITY_GATES = [
  "materially-distinct-structure",
  "responsive-mobile-first",
  "accessible-keyboard-behavior",
  "theme-token-only-colors",
  "no-horizontal-overflow",
  "content-length-tolerance",
  "empty-state-safe",
  "editor-selectable",
  "supports-real-business-content",
] as const;
