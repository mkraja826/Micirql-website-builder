export type StructuralBlueprint = {
  id: string;
  family: "navbar" | "hero" | "footer";
  name: string;
  structure: string;
  bestFor: string[];
};

export const NAVBAR_BLUEPRINTS: StructuralBlueprint[] = [
  { id: "nav-01", family: "navbar", name: "Classic Split", structure: "logo | centered links | primary CTA", bestFor: ["corporate", "professional", "clinic"] },
  { id: "nav-02", family: "navbar", name: "Logo Left Utility Right", structure: "logo | links | phone/utility + CTA", bestFor: ["local-service", "clinic", "hospitality"] },
  { id: "nav-03", family: "navbar", name: "Centered Brand", structure: "links | centered logo | actions", bestFor: ["luxury", "hospitality", "creative"] },
  { id: "nav-04", family: "navbar", name: "Minimal Floating", structure: "floating capsule: logo | links | CTA", bestFor: ["saas", "portfolio", "premium"] },
  { id: "nav-05", family: "navbar", name: "Transparent Overlay", structure: "overlay logo | links | CTA over hero", bestFor: ["cinematic", "hospitality", "real-estate"] },
  { id: "nav-06", family: "navbar", name: "Utility Topbar", structure: "utility strip + main nav", bestFor: ["clinic", "corporate", "education"] },
  { id: "nav-07", family: "navbar", name: "Mega Navigation", structure: "logo | grouped mega-menu | CTA", bestFor: ["corporate", "saas", "ecommerce"] },
  { id: "nav-08", family: "navbar", name: "Compact Product", structure: "logo | product links | login | CTA", bestFor: ["saas", "technology"] },
  { id: "nav-09", family: "navbar", name: "Editorial Rail", structure: "brand block | sparse links | action", bestFor: ["editorial", "creative", "architecture"] },
  { id: "nav-10", family: "navbar", name: "Commerce Search", structure: "logo | search | categories | account/cart", bestFor: ["ecommerce", "retail"] },
  { id: "nav-11", family: "navbar", name: "Property Search", structure: "logo | buy/rent/projects | search | contact", bestFor: ["real-estate"] },
  { id: "nav-12", family: "navbar", name: "Booking First", structure: "logo | concise links | booking CTA", bestFor: ["clinic", "hospitality", "local-service"] },
  { id: "nav-13", family: "navbar", name: "Dark Command Bar", structure: "dark full-width nav with bright action", bestFor: ["technology", "bold", "corporate"] },
  { id: "nav-14", family: "navbar", name: "Brand Block", structure: "colored brand block + neutral navigation", bestFor: ["bold", "creative", "local-service"] },
  { id: "nav-15", family: "navbar", name: "Side Navigation", structure: "desktop side rail; mobile burger", bestFor: ["portfolio", "editorial", "studio"] },
  { id: "nav-16", family: "navbar", name: "Minimal Logo Menu", structure: "logo | menu trigger | primary CTA", bestFor: ["cinematic", "luxury", "portfolio"] },
];

export const HERO_BLUEPRINTS: StructuralBlueprint[] = [
  { id: "hero-01", family: "hero", name: "Balanced Split", structure: "copy left | media right", bestFor: ["all"] },
  { id: "hero-02", family: "hero", name: "Media First Split", structure: "media left | copy right", bestFor: ["portfolio", "hospitality", "clinic"] },
  { id: "hero-03", family: "hero", name: "Centered Statement", structure: "eyebrow + large centered headline + CTA", bestFor: ["saas", "professional", "minimal"] },
  { id: "hero-04", family: "hero", name: "Cinematic Full Bleed", structure: "full-bleed media + bottom overlay copy", bestFor: ["hospitality", "real-estate", "creative"] },
  { id: "hero-05", family: "hero", name: "Editorial Asymmetric", structure: "index/eyebrow | headline | supporting media", bestFor: ["editorial", "architecture", "studio"] },
  { id: "hero-06", family: "hero", name: "Product Interface", structure: "centered copy + product screenshot/device", bestFor: ["saas", "technology"] },
  { id: "hero-07", family: "hero", name: "Search Led", structure: "headline + prominent search/filter control", bestFor: ["real-estate", "marketplace", "directory"] },
  { id: "hero-08", family: "hero", name: "Booking Led", structure: "copy + appointment/reservation card", bestFor: ["clinic", "hospitality", "local-service"] },
  { id: "hero-09", family: "hero", name: "Proof First", structure: "headline + trust metrics/logos + CTA", bestFor: ["professional", "corporate", "saas"] },
  { id: "hero-10", family: "hero", name: "Service Selector", structure: "headline + service category cards", bestFor: ["clinic", "local-service", "education"] },
  { id: "hero-11", family: "hero", name: "Founder/Expert", structure: "expert portrait + authority copy + CTA", bestFor: ["consultant", "doctor", "coach"] },
  { id: "hero-12", family: "hero", name: "Project Showcase", structure: "large project media + project metadata", bestFor: ["portfolio", "architecture", "real-estate"] },
  { id: "hero-13", family: "hero", name: "Color Block", structure: "strong brand block + contrasting content block", bestFor: ["bold", "creative", "retail"] },
  { id: "hero-14", family: "hero", name: "Layered Cards", structure: "headline + floating proof/service cards + media", bestFor: ["modern", "saas", "professional"] },
  { id: "hero-15", family: "hero", name: "Minimal Typographic", structure: "oversized type + tiny supporting copy", bestFor: ["luxury", "editorial", "creative"] },
  { id: "hero-16", family: "hero", name: "Video Story", structure: "video background/feature + concise CTA", bestFor: ["hospitality", "brand", "corporate"] },
  { id: "hero-17", family: "hero", name: "Commerce Collection", structure: "campaign headline + product/collection tiles", bestFor: ["ecommerce", "retail"] },
  { id: "hero-18", family: "hero", name: "Offer Focus", structure: "offer/value prop + urgency/support + CTA", bestFor: ["local-service", "ecommerce", "education"] },
  { id: "hero-19", family: "hero", name: "Dual Audience", structure: "shared headline + two audience paths", bestFor: ["education", "saas", "corporate"] },
  { id: "hero-20", family: "hero", name: "Map/Location", structure: "local value prop + map/location visual", bestFor: ["local-service", "clinic", "real-estate"] },
  { id: "hero-21", family: "hero", name: "Case Result", structure: "headline + result snapshot + CTA", bestFor: ["professional", "agency", "corporate"] },
  { id: "hero-22", family: "hero", name: "Multi Image Mosaic", structure: "copy + asymmetric image mosaic", bestFor: ["hospitality", "creative", "clinic"] },
  { id: "hero-23", family: "hero", name: "Horizontal Narrative", structure: "headline + horizontally staged content/media", bestFor: ["editorial", "portfolio", "brand"] },
  { id: "hero-24", family: "hero", name: "Dark Premium", structure: "dark immersive shell + luminous brand accent", bestFor: ["luxury", "technology", "premium"] },
];

export const FOOTER_BLUEPRINTS: StructuralBlueprint[] = [
  { id: "footer-01", family: "footer", name: "Classic Columns", structure: "brand + 3-4 link columns + legal", bestFor: ["all"] },
  { id: "footer-02", family: "footer", name: "Compact Utility", structure: "brand | key links | legal", bestFor: ["local-service", "minimal"] },
  { id: "footer-03", family: "footer", name: "CTA Footer", structure: "large conversion statement + links below", bestFor: ["professional", "saas", "agency"] },
  { id: "footer-04", family: "footer", name: "Contact First", structure: "address/contact/actions + navigation", bestFor: ["clinic", "hospitality", "local-service"] },
  { id: "footer-05", family: "footer", name: "Newsletter", structure: "newsletter block + grouped links", bestFor: ["ecommerce", "education", "media"] },
  { id: "footer-06", family: "footer", name: "Mega Footer", structure: "deep navigation + products/services/company/legal", bestFor: ["corporate", "saas", "ecommerce"] },
  { id: "footer-07", family: "footer", name: "Editorial Minimal", structure: "large brand wordmark + sparse links", bestFor: ["creative", "editorial", "luxury"] },
  { id: "footer-08", family: "footer", name: "Location Network", structure: "locations + contact + legal", bestFor: ["corporate", "clinic", "real-estate"] },
  { id: "footer-09", family: "footer", name: "Social Brand", structure: "brand statement + social links + utility", bestFor: ["creative", "hospitality", "retail"] },
  { id: "footer-10", family: "footer", name: "Dark Conversion", structure: "dark CTA panel + navigation + legal", bestFor: ["premium", "technology", "professional"] },
  { id: "footer-11", family: "footer", name: "Product Ecosystem", structure: "products + resources + developers + company", bestFor: ["saas", "technology"] },
  { id: "footer-12", family: "footer", name: "Commerce Support", structure: "shop + support + policies + payment/trust", bestFor: ["ecommerce", "retail"] },
];

export const CORE_STRUCTURAL_BLUEPRINTS = [...NAVBAR_BLUEPRINTS, ...HERO_BLUEPRINTS, ...FOOTER_BLUEPRINTS];
