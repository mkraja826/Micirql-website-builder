export type ContentBlueprintFamily = "services" | "features" | "about" | "process" | "proof" | "testimonials" | "gallery" | "team" | "cta" | "contact";

export type ContentStructuralBlueprint = {
  id: string;
  family: ContentBlueprintFamily;
  name: string;
  structure: string;
  bestFor: string[];
};

export const SERVICES_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "services-01", family: "services", name: "Classic Card Grid", structure: "section intro + 3-column service cards", bestFor: ["all"] },
  { id: "services-02", family: "services", name: "Editorial List", structure: "large numbered service rows + short descriptions", bestFor: ["professional", "creative", "luxury"] },
  { id: "services-03", family: "services", name: "Image Service Grid", structure: "image-led service tiles + overlay labels", bestFor: ["clinic", "hospitality", "local-service"] },
  { id: "services-04", family: "services", name: "Split Explorer", structure: "service navigation left + active service detail right", bestFor: ["corporate", "professional", "saas"] },
  { id: "services-05", family: "services", name: "Horizontal Rail", structure: "intro + horizontally scrolling service cards", bestFor: ["modern", "mobile-first", "creative"] },
  { id: "services-06", family: "services", name: "Icon Matrix", structure: "compact icon/title/description matrix", bestFor: ["saas", "corporate", "education"] },
  { id: "services-07", family: "services", name: "Featured Service", structure: "one dominant service + supporting service list", bestFor: ["clinic", "local-service", "professional"] },
  { id: "services-08", family: "services", name: "Outcome Led", structure: "customer outcome headings + linked services", bestFor: ["consulting", "agency", "technology"] },
  { id: "services-09", family: "services", name: "Accordion Services", structure: "large accordion list with supporting media", bestFor: ["mobile-first", "professional", "education"] },
  { id: "services-10", family: "services", name: "Category Bands", structure: "stacked full-width service category bands", bestFor: ["corporate", "healthcare", "education"] },
  { id: "services-11", family: "services", name: "Service Comparison", structure: "service columns with fit/use-case indicators", bestFor: ["saas", "professional", "pricing-sensitive"] },
  { id: "services-12", family: "services", name: "Mosaic Services", structure: "asymmetric tile mosaic with mixed sizes", bestFor: ["creative", "hospitality", "premium"] },
  { id: "services-13", family: "services", name: "Process Attached", structure: "services paired with short delivery steps", bestFor: ["agency", "consulting", "local-service"] },
  { id: "services-14", family: "services", name: "Searchable Services", structure: "search/filter + service directory cards", bestFor: ["healthcare", "education", "large-catalog"] },
  { id: "services-15", family: "services", name: "Dark Service Stack", structure: "dark band + oversized stacked service links", bestFor: ["premium", "technology", "creative"] },
  { id: "services-16", family: "services", name: "Compact Conversion", structure: "short services grid + immediate CTA", bestFor: ["local-service", "lead-generation"] },
];

export const FEATURES_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "features-01", family: "features", name: "Feature Grid", structure: "intro + icon feature grid", bestFor: ["saas", "corporate", "all"] },
  { id: "features-02", family: "features", name: "Product Alternation", structure: "alternating copy/media feature rows", bestFor: ["saas", "technology"] },
  { id: "features-03", family: "features", name: "Bento Features", structure: "mixed-size bento feature cards", bestFor: ["saas", "modern", "technology"] },
  { id: "features-04", family: "features", name: "Feature Tabs", structure: "tab navigation + focused feature panel", bestFor: ["saas", "enterprise"] },
  { id: "features-05", family: "features", name: "Capability Rail", structure: "large capability labels + supporting facts", bestFor: ["corporate", "professional"] },
  { id: "features-06", family: "features", name: "Benefits First", structure: "benefit statements + feature evidence", bestFor: ["lead-generation", "professional"] },
  { id: "features-07", family: "features", name: "Sticky Feature Story", structure: "sticky media + scrolling feature copy", bestFor: ["premium", "technology"] },
  { id: "features-08", family: "features", name: "Feature Comparison", structure: "before/after or old/new comparison", bestFor: ["saas", "product"] },
  { id: "features-09", family: "features", name: "Metric Features", structure: "feature cards anchored by measurable stats", bestFor: ["corporate", "technology", "professional"] },
  { id: "features-10", family: "features", name: "Compact Checklist", structure: "two-column checklist with proof block", bestFor: ["local-service", "education", "pricing"] },
  { id: "features-11", family: "features", name: "Interface Callouts", structure: "product screenshot + anchored callout labels", bestFor: ["saas", "app"] },
  { id: "features-12", family: "features", name: "Color Block Features", structure: "alternating branded feature bands", bestFor: ["bold", "retail", "creative"] },
  { id: "features-13", family: "features", name: "Accordion Features", structure: "compact accordion + media preview", bestFor: ["mobile-first", "complex-product"] },
  { id: "features-14", family: "features", name: "Ecosystem Map", structure: "central product + connected capability nodes", bestFor: ["technology", "platform", "corporate"] },
];

export const ABOUT_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "about-01", family: "about", name: "Story Split", structure: "brand story copy + supporting image", bestFor: ["all"] },
  { id: "about-02", family: "about", name: "Founder Story", structure: "founder portrait + narrative + signature/quote", bestFor: ["professional", "clinic", "creative"] },
  { id: "about-03", family: "about", name: "Mission Values", structure: "mission statement + values cards", bestFor: ["corporate", "education", "nonprofit"] },
  { id: "about-04", family: "about", name: "Timeline Story", structure: "company timeline + milestone media", bestFor: ["corporate", "heritage", "brand"] },
  { id: "about-05", family: "about", name: "Editorial Manifesto", structure: "oversized statement + small supporting narrative", bestFor: ["creative", "luxury", "editorial"] },
  { id: "about-06", family: "about", name: "Stats Story", structure: "narrative + key company statistics", bestFor: ["professional", "corporate"] },
  { id: "about-07", family: "about", name: "Image Mosaic Story", structure: "story copy + multi-image collage", bestFor: ["hospitality", "clinic", "creative"] },
  { id: "about-08", family: "about", name: "Principles List", structure: "short intro + numbered operating principles", bestFor: ["consulting", "technology", "agency"] },
  { id: "about-09", family: "about", name: "Location Story", structure: "business story + map/location context", bestFor: ["local-service", "hospitality", "clinic"] },
  { id: "about-10", family: "about", name: "People First", structure: "team image + culture narrative + values", bestFor: ["corporate", "agency", "education"] },
  { id: "about-11", family: "about", name: "Certification Story", structure: "about narrative + credentials/certification strip", bestFor: ["healthcare", "industrial", "professional"] },
  { id: "about-12", family: "about", name: "Minimal Quote", structure: "large brand quote + concise company context", bestFor: ["luxury", "creative", "premium"] },
];

export const PROCESS_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "process-01", family: "process", name: "Numbered Steps", structure: "3-5 sequential numbered steps", bestFor: ["all"] },
  { id: "process-02", family: "process", name: "Horizontal Timeline", structure: "desktop horizontal timeline; mobile vertical", bestFor: ["professional", "local-service"] },
  { id: "process-03", family: "process", name: "Vertical Journey", structure: "vertical step rail + descriptions", bestFor: ["mobile-first", "clinic", "education"] },
  { id: "process-04", family: "process", name: "Alternating Journey", structure: "alternating step copy/media rows", bestFor: ["premium", "professional"] },
  { id: "process-05", family: "process", name: "Process Cards", structure: "card grid with number + action + output", bestFor: ["agency", "technology"] },
  { id: "process-06", family: "process", name: "Outcome Timeline", structure: "each step paired with customer outcome", bestFor: ["consulting", "healthcare", "education"] },
  { id: "process-07", family: "process", name: "Sticky Stage", structure: "sticky stage title + scrolling details", bestFor: ["premium", "editorial"] },
  { id: "process-08", family: "process", name: "Loop Process", structure: "cyclical process diagram + supporting copy", bestFor: ["saas", "consulting", "operations"] },
  { id: "process-09", family: "process", name: "Before During After", structure: "three-phase process grouped by customer stage", bestFor: ["clinic", "local-service", "events"] },
  { id: "process-10", family: "process", name: "Checklist Journey", structure: "compact checklist with progress path", bestFor: ["lead-generation", "education"] },
  { id: "process-11", family: "process", name: "Process + FAQ", structure: "steps left + related FAQ right", bestFor: ["complex-service", "professional"] },
  { id: "process-12", family: "process", name: "Immersive Chapters", structure: "full-width visual chapter per process stage", bestFor: ["creative", "luxury", "hospitality"] },
];

export const PROOF_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "proof-01", family: "proof", name: "Logo Cloud", structure: "trusted-by statement + client/partner logos", bestFor: ["saas", "professional", "corporate"] },
  { id: "proof-02", family: "proof", name: "Metrics Band", structure: "3-5 large metrics across a band", bestFor: ["corporate", "professional", "saas"] },
  { id: "proof-03", family: "proof", name: "Case Result Cards", structure: "case cards with problem/outcome summary", bestFor: ["agency", "consulting", "technology"] },
  { id: "proof-04", family: "proof", name: "Credential Grid", structure: "certifications/awards/accreditations grid", bestFor: ["clinic", "industrial", "professional"] },
  { id: "proof-05", family: "proof", name: "Press Strip", structure: "featured-in logos + short recognition copy", bestFor: ["brand", "startup", "professional"] },
  { id: "proof-06", family: "proof", name: "Result Spotlight", structure: "one dominant result + supporting metrics", bestFor: ["agency", "professional"] },
  { id: "proof-07", family: "proof", name: "Before After Proof", structure: "before/after media + context + disclaimer", bestFor: ["clinic", "home-service", "creative"] },
  { id: "proof-08", family: "proof", name: "Review Summary", structure: "aggregate rating + review source badges", bestFor: ["local-service", "hospitality", "clinic"] },
  { id: "proof-09", family: "proof", name: "Trust Checklist", structure: "guarantees/process assurances + icons", bestFor: ["local-service", "ecommerce"] },
  { id: "proof-10", family: "proof", name: "Security Trust", structure: "security/compliance credentials + details", bestFor: ["saas", "technology", "enterprise"] },
  { id: "proof-11", family: "proof", name: "Client Mosaic", structure: "mixed logo/case/quote proof mosaic", bestFor: ["creative", "agency", "corporate"] },
  { id: "proof-12", family: "proof", name: "Dark Authority Band", structure: "dark proof band with metrics + logos", bestFor: ["premium", "technology", "corporate"] },
];

export const TESTIMONIAL_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "testimonials-01", family: "testimonials", name: "Quote Cards", structure: "3-column testimonial cards", bestFor: ["all"] },
  { id: "testimonials-02", family: "testimonials", name: "Single Feature Quote", structure: "oversized quote + author + media", bestFor: ["premium", "professional", "creative"] },
  { id: "testimonials-03", family: "testimonials", name: "Review Carousel", structure: "horizontal quote carousel", bestFor: ["local-service", "clinic", "hospitality"] },
  { id: "testimonials-04", family: "testimonials", name: "Video Testimonials", structure: "video cards + concise customer context", bestFor: ["education", "professional", "clinic"] },
  { id: "testimonials-05", family: "testimonials", name: "Rating Wall", structure: "ratings summary + compact review wall", bestFor: ["ecommerce", "local-service"] },
  { id: "testimonials-06", family: "testimonials", name: "Case Quote Split", structure: "customer result left + quote right", bestFor: ["saas", "agency", "consulting"] },
  { id: "testimonials-07", family: "testimonials", name: "Editorial Quotes", structure: "large stacked typographic quotes", bestFor: ["luxury", "creative", "editorial"] },
  { id: "testimonials-08", family: "testimonials", name: "Persona Reviews", structure: "testimonials grouped by customer type", bestFor: ["saas", "education", "healthcare"] },
  { id: "testimonials-09", family: "testimonials", name: "Photo Story Reviews", structure: "portrait/image + longer customer story", bestFor: ["hospitality", "clinic", "creative"] },
  { id: "testimonials-10", family: "testimonials", name: "Compact Social Proof", structure: "one-line quotes + logos/ratings", bestFor: ["saas", "conversion"] },
  { id: "testimonials-11", family: "testimonials", name: "Dark Quote Stage", structure: "dark full-width testimonial stage", bestFor: ["premium", "technology"] },
  { id: "testimonials-12", family: "testimonials", name: "Review Source Tabs", structure: "Google/industry/source tabs + reviews", bestFor: ["local-service", "clinic", "hospitality"] },
];

export const GALLERY_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "gallery-01", family: "gallery", name: "Uniform Grid", structure: "clean responsive image grid", bestFor: ["all"] },
  { id: "gallery-02", family: "gallery", name: "Masonry", structure: "variable-height masonry gallery", bestFor: ["creative", "hospitality"] },
  { id: "gallery-03", family: "gallery", name: "Editorial Mosaic", structure: "asymmetric mixed-size image mosaic", bestFor: ["luxury", "creative", "clinic"] },
  { id: "gallery-04", family: "gallery", name: "Horizontal Showcase", structure: "large horizontal scrolling gallery", bestFor: ["portfolio", "architecture", "hospitality"] },
  { id: "gallery-05", family: "gallery", name: "Featured + Thumbnails", structure: "dominant media + thumbnail rail", bestFor: ["real-estate", "ecommerce", "portfolio"] },
  { id: "gallery-06", family: "gallery", name: "Category Gallery", structure: "filters/tabs + gallery grid", bestFor: ["portfolio", "clinic", "real-estate"] },
  { id: "gallery-07", family: "gallery", name: "Before After Gallery", structure: "before/after comparisons in grid", bestFor: ["clinic", "home-service"] },
  { id: "gallery-08", family: "gallery", name: "Captioned Stories", structure: "large images + editorial captions", bestFor: ["creative", "hospitality", "brand"] },
  { id: "gallery-09", family: "gallery", name: "Fullscreen Carousel", structure: "full-width media carousel + progress", bestFor: ["luxury", "real-estate", "portfolio"] },
  { id: "gallery-10", family: "gallery", name: "Project Grid", structure: "image + project metadata + tags", bestFor: ["architecture", "agency", "portfolio"] },
  { id: "gallery-11", family: "gallery", name: "Product Lifestyle", structure: "product/lifestyle mixed media grid", bestFor: ["ecommerce", "retail"] },
  { id: "gallery-12", family: "gallery", name: "Minimal Filmstrip", structure: "single-row image filmstrip with sparse copy", bestFor: ["editorial", "luxury", "creative"] },
];

export const TEAM_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "team-01", family: "team", name: "Team Card Grid", structure: "portrait + name + role card grid", bestFor: ["all"] },
  { id: "team-02", family: "team", name: "Leadership Focus", structure: "featured leader + supporting leadership grid", bestFor: ["corporate", "professional"] },
  { id: "team-03", family: "team", name: "Expert Profiles", structure: "large expert cards with credentials", bestFor: ["clinic", "legal", "consulting"] },
  { id: "team-04", family: "team", name: "Editorial People", structure: "large portraits + minimal role text", bestFor: ["creative", "luxury"] },
  { id: "team-05", family: "team", name: "Department Tabs", structure: "team filtered by department/category", bestFor: ["corporate", "education", "clinic"] },
  { id: "team-06", family: "team", name: "Founder + Team", structure: "founder story + compact team list", bestFor: ["startup", "agency", "professional"] },
  { id: "team-07", family: "team", name: "Horizontal People Rail", structure: "scrolling portrait cards", bestFor: ["modern", "mobile-first"] },
  { id: "team-08", family: "team", name: "Team List", structure: "minimal name/role/contact rows", bestFor: ["professional", "corporate"] },
  { id: "team-09", family: "team", name: "Culture Mosaic", structure: "team portraits mixed with culture images", bestFor: ["agency", "creative", "corporate"] },
  { id: "team-10", family: "team", name: "Provider Booking", structure: "expert profile + availability/booking action", bestFor: ["clinic", "consulting", "education"] },
];

export const CTA_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "cta-01", family: "cta", name: "Simple Band", structure: "headline + short copy + primary CTA", bestFor: ["all"] },
  { id: "cta-02", family: "cta", name: "Split CTA", structure: "statement left + action right", bestFor: ["professional", "corporate"] },
  { id: "cta-03", family: "cta", name: "Brand Block", structure: "full brand-color block + strong CTA", bestFor: ["bold", "modern"] },
  { id: "cta-04", family: "cta", name: "Dark Premium", structure: "dark conversion panel + luminous action", bestFor: ["premium", "technology"] },
  { id: "cta-05", family: "cta", name: "Image CTA", structure: "background image + overlay conversion copy", bestFor: ["hospitality", "real-estate", "clinic"] },
  { id: "cta-06", family: "cta", name: "Two Path CTA", structure: "two audience/action choices", bestFor: ["education", "saas", "corporate"] },
  { id: "cta-07", family: "cta", name: "Booking CTA", structure: "appointment prompt + booking action", bestFor: ["clinic", "hospitality"] },
  { id: "cta-08", family: "cta", name: "Quote CTA", structure: "quote request value prop + compact form trigger", bestFor: ["local-service", "professional"] },
  { id: "cta-09", family: "cta", name: "Product CTA", structure: "product visual + trial/demo action", bestFor: ["saas", "technology"] },
  { id: "cta-10", family: "cta", name: "Newsletter CTA", structure: "editorial signup statement + email field", bestFor: ["ecommerce", "education", "content"] },
  { id: "cta-11", family: "cta", name: "Proof CTA", structure: "trust metric/review + CTA", bestFor: ["professional", "local-service"] },
  { id: "cta-12", family: "cta", name: "Floating Conversion Card", structure: "elevated CTA card overlapping sections", bestFor: ["premium", "modern"] },
  { id: "cta-13", family: "cta", name: "Minimal Typographic", structure: "oversized CTA statement + text link/action", bestFor: ["luxury", "creative", "editorial"] },
  { id: "cta-14", family: "cta", name: "Sticky Mobile CTA", structure: "desktop band + persistent mobile action", bestFor: ["local-service", "clinic", "lead-generation"] },
];

export const CONTACT_BLUEPRINTS: ContentStructuralBlueprint[] = [
  { id: "contact-01", family: "contact", name: "Form Split", structure: "contact copy/details left + form right", bestFor: ["all"] },
  { id: "contact-02", family: "contact", name: "Centered Form", structure: "centered heading + compact form", bestFor: ["minimal", "professional"] },
  { id: "contact-03", family: "contact", name: "Map + Form", structure: "map/location panel + contact form", bestFor: ["local-service", "clinic", "hospitality"] },
  { id: "contact-04", family: "contact", name: "Contact Cards", structure: "call/email/location cards + short form", bestFor: ["corporate", "local-service"] },
  { id: "contact-05", family: "contact", name: "Booking Panel", structure: "booking details + scheduler/action panel", bestFor: ["clinic", "consulting", "hospitality"] },
  { id: "contact-06", family: "contact", name: "Quote Builder", structure: "multi-field quote/request form + support copy", bestFor: ["local-service", "B2B"] },
  { id: "contact-07", family: "contact", name: "Office Network", structure: "location selector + office details + contact", bestFor: ["corporate", "real-estate", "clinic"] },
  { id: "contact-08", family: "contact", name: "Minimal Direct", structure: "large email/phone + sparse secondary details", bestFor: ["creative", "luxury", "portfolio"] },
  { id: "contact-09", family: "contact", name: "Concierge Contact", structure: "premium concierge copy + action choices", bestFor: ["luxury", "hospitality", "real-estate"] },
  { id: "contact-10", family: "contact", name: "Support Channels", structure: "sales/support/partnership channel cards", bestFor: ["saas", "corporate", "technology"] },
  { id: "contact-11", family: "contact", name: "WhatsApp/Call First", structure: "instant contact actions + fallback form", bestFor: ["local-service", "clinic", "mobile-first"] },
  { id: "contact-12", family: "contact", name: "Dark Contact Stage", structure: "dark branded contact shell + light form card", bestFor: ["premium", "technology", "corporate"] },
  { id: "contact-13", family: "contact", name: "FAQ Contact", structure: "contact form + pre-contact FAQ", bestFor: ["professional", "education", "complex-service"] },
  { id: "contact-14", family: "contact", name: "Lead Qualification", structure: "short qualification form + expectation copy", bestFor: ["consulting", "agency", "B2B"] },
];

export const CONTENT_STRUCTURAL_BLUEPRINTS: ContentStructuralBlueprint[] = [
  ...SERVICES_BLUEPRINTS,
  ...FEATURES_BLUEPRINTS,
  ...ABOUT_BLUEPRINTS,
  ...PROCESS_BLUEPRINTS,
  ...PROOF_BLUEPRINTS,
  ...TESTIMONIAL_BLUEPRINTS,
  ...GALLERY_BLUEPRINTS,
  ...TEAM_BLUEPRINTS,
  ...CTA_BLUEPRINTS,
  ...CONTACT_BLUEPRINTS,
];
