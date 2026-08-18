import type { WebsiteLayoutBlueprint, WebsiteLayoutSection } from "./website-layout-blueprints";

const section = (id: string, family: string, pattern: string, purpose: string, required = false): WebsiteLayoutSection => ({ id, family, pattern, purpose, required });

const NAV = section("nav", "navbar", "industry-shell", "Primary navigation and appointment access", true);
const HERO = section("hero", "hero", "industry-hero", "Opening value proposition and primary conversion", true);
const TRUST = section("trust", "testimonials", "trust-strip", "Immediate credibility and reassurance");
const SERVICES = section("services", "services", "treatment-system", "Treatment discovery", true);
const DOCTOR = section("doctor", "team", "expert-profile", "Doctor authority and human trust");
const TECHNOLOGY = section("technology", "features", "technology-proof", "Clinical technology and treatment confidence");
const PROCESS = section("process", "process", "treatment-journey", "Explain what happens next");
const PROOF = section("proof", "testimonials", "patient-proof", "Patient confidence and social proof");
const GALLERY = section("gallery", "gallery", "outcome-gallery", "Visual evidence and clinic atmosphere");
const CTA = section("cta", "cta", "appointment-conversion", "Focused appointment action", true);
const CONTACT = section("contact", "contact", "clinic-contact", "Appointment request and clinic details", true);
const FOOTER = section("footer", "footer", "industry-footer", "Navigation, contact and legal", true);

const QUALITY = {
  minimumDesktopScore: 8.5,
  minimumMobileScore: 8.5,
  requiredViewports: [360, 390, 430, 768, 1024, 1440],
  hardRules: [
    "no document-level horizontal overflow",
    "no clipped or overlapping text",
    "no accidental overlays",
    "primary CTA remains visible and usable on mobile",
    "all images remain inside their composition bounds",
    "mobile composition must be intentionally reordered rather than desktop merely shrinking",
  ],
} as const;

function makeLayout(input: {
  id: string;
  name: string;
  description: string;
  archetype: string;
  tags: string[];
  subindustries: string[];
  goals: string[];
  priorities: string[];
  nav: string;
  hero: string;
  footer: string;
  palettes: string[];
  type: string[];
  density: WebsiteLayoutBlueprint["design"]["density"];
  imageStyle: WebsiteLayoutBlueprint["design"]["imageStyle"];
  radius: WebsiteLayoutBlueprint["design"]["radius"];
  rhythm: WebsiteLayoutBlueprint["design"]["sectionRhythm"];
  sections: WebsiteLayoutSection[];
  mobileRules: string[];
  desktopRules: string[];
  tabletRules?: string[];
  allowedMutations?: string[];
  locked?: string[];
}): WebsiteLayoutBlueprint {
  const ids = input.sections.map((item) => item.id);
  return {
    id: input.id,
    industry: "dental",
    name: input.name,
    description: input.description,
    archetype: input.archetype,
    origin: "curated",
    status: "certified",
    version: 1,
    styleTags: input.tags,
    fit: { subindustryIds: input.subindustries, goals: input.goals, priorities: input.priorities },
    shell: { navbarBlueprintId: input.nav, heroBlueprintId: input.hero, footerBlueprintId: input.footer },
    design: {
      preferredPaletteIds: input.palettes,
      preferredTypographyIds: input.type,
      density: input.density,
      imageStyle: input.imageStyle,
      radius: input.radius,
      sectionRhythm: input.rhythm,
    },
    sections: input.sections,
    responsive: {
      mobile: { sectionOrder: ids, rules: input.mobileRules },
      tablet: { sectionOrder: ids, rules: input.tabletRules ?? ["use one or two columns only", "preserve generous touch targets", "remove decorative offsets that reduce readable width"] },
      desktop: { sectionOrder: ids, rules: input.desktopRules },
    },
    mutation: {
      allowed: input.allowedMutations ?? ["palette within approved dental pack", "typography within approved dental pack", "image assets", "copy", "card radius within blueprint range", "optional proof placement"],
      locked: input.locked ?? ["mobile section order", "primary conversion placement", "core responsive composition", "minimum contrast", "overflow safety rules"],
    },
    quality: { ...QUALITY, hardRules: [...QUALITY.hardRules] },
  };
}

export const DENTAL_LAYOUT_BLUEPRINTS: WebsiteLayoutBlueprint[] = [
  makeLayout({
    id: "dental-01-clinical-authority", name: "Clinical Authority", description: "Clean specialist-led clinic with strong credentials, technology and treatment clarity.", archetype: "minimal-premium", tags: ["clinical", "clean", "authoritative", "minimal"], subindustries: ["general-dentistry", "implant-dentistry", "endodontics"], goals: ["book appointment", "build trust"], priorities: ["doctor trust", "technology", "treatments"], nav: "nav-01", hero: "hero-11", footer: "footer-04", palettes: ["dental-clinical-blue", "dental-navy-premium"], type: ["dental-type-clean"], density: "airy", imageStyle: "clinical", radius: "soft", rhythm: "alternating", sections: [NAV, HERO, TRUST, SERVICES, DOCTOR, TECHNOLOGY, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["portrait follows headline", "trust strip becomes two-by-two facts", "treatments stack as full-width cards", "doctor credentials remain above testimonials"], desktopRules: ["expert portrait and authority copy share hero", "alternate white and tinted sections", "technology uses asymmetric media split"] }),
  makeLayout({
    id: "dental-02-implant-luxury", name: "Implant Atelier", description: "High-value implant consultation experience with editorial typography and restrained luxury.", archetype: "minimal-premium", tags: ["implant", "luxury", "editorial", "premium"], subindustries: ["implant-dentistry"], goals: ["implant consultation", "high-value treatment lead"], priorities: ["implant expertise", "doctor credentials", "technology"], nav: "nav-16", hero: "hero-24", footer: "footer-07", palettes: ["dental-navy-premium", "dental-warm-ivory"], type: ["dental-type-premium"], density: "airy", imageStyle: "portrait-led", radius: "square", rhythm: "editorial", sections: [NAV, HERO, DOCTOR, SERVICES, TECHNOLOGY, PROCESS, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["remove all floating layers", "hero becomes portrait then headline then CTA", "implant process is vertical numbered timeline", "buttons span full width"], desktopRules: ["cinematic dark hero", "editorial negative space", "doctor section uses oversized portrait", "gold accent limited to key conversion details"] }),
  makeLayout({
    id: "dental-03-smile-studio", name: "Smile Studio", description: "Visual-first cosmetic dentistry layout centered on confidence, outcomes and consultation.", archetype: "visual-image-led", tags: ["cosmetic", "visual", "elegant", "outcomes"], subindustries: ["cosmetic-dentistry"], goals: ["cosmetic consultation", "show outcomes"], priorities: ["visual outcomes", "confidence", "doctor expertise"], nav: "nav-03", hero: "hero-22", footer: "footer-09", palettes: ["dental-lavender-cosmetic", "dental-warm-ivory"], type: ["dental-type-premium", "dental-type-humanist"], density: "balanced", imageStyle: "outcome-led", radius: "rounded", rhythm: "editorial", sections: [NAV, HERO, GALLERY, SERVICES, DOCTOR, PROOF, PROCESS, CTA, CONTACT, FOOTER], mobileRules: ["mosaic becomes a single lead image plus swipe-safe secondary gallery", "before/after content never overlays labels", "service cards stack", "doctor portrait uses 4:5 ratio"], desktopRules: ["asymmetric image mosaic", "services use editorial rows", "outcome gallery gets strongest visual weight"] }),
  makeLayout({
    id: "dental-04-family-care", name: "Family Care", description: "Warm approachable clinic layout emphasizing comfort, breadth of care and easy booking.", archetype: "conversion-lead-generation", tags: ["family", "friendly", "approachable", "bright"], subindustries: ["general-dentistry", "orthodontics"], goals: ["book appointment", "build trust"], priorities: ["treatments", "location", "appointment"], nav: "nav-12", hero: "hero-08", footer: "footer-04", palettes: ["dental-sky-family", "dental-aqua-trust"], type: ["dental-type-humanist"], density: "balanced", imageStyle: "lifestyle", radius: "rounded", rhythm: "conversion", sections: [NAV, HERO, TRUST, SERVICES, PROCESS, DOCTOR, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["booking action follows hero copy immediately", "service icons become simple stacked rows", "location and phone stay thumb reachable", "avoid decorative horizontal scrolling"], desktopRules: ["friendly booking card in hero", "three-column service overview", "soft alternating surfaces"] }),
  makeLayout({
    id: "dental-05-digital-dentistry", name: "Digital Dentistry", description: "Technology-forward clinic presentation with digital workflow, scanning and precision care.", archetype: "modern-experimental", tags: ["technology", "advanced", "modern", "precision"], subindustries: ["implant-dentistry", "orthodontics", "endodontics"], goals: ["book appointment", "build trust"], priorities: ["technology", "treatment planning", "doctor trust"], nav: "nav-13", hero: "hero-06", footer: "footer-10", palettes: ["dental-emerald-implant", "dental-clinical-blue"], type: ["dental-type-modern"], density: "balanced", imageStyle: "technology-led", radius: "soft", rhythm: "immersive", sections: [NAV, HERO, TECHNOLOGY, SERVICES, PROCESS, DOCTOR, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["device/technology visual appears after concise hero CTA", "feature grid becomes single column", "process uses vertically connected steps", "dark sections never touch without a light separator"], desktopRules: ["product-interface style hero", "technology proof appears before treatments", "dark/light section rhythm"] }),
  makeLayout({
    id: "dental-06-doctor-brand", name: "Doctor Signature", description: "Personal-brand dental site where the clinician is the central trust asset.", archetype: "editorial-brand-led", tags: ["doctor", "personal-brand", "expert", "editorial"], subindustries: ["implant-dentistry", "cosmetic-dentistry", "endodontics"], goals: ["build trust", "book appointment"], priorities: ["doctor credentials", "doctor trust", "visual outcomes"], nav: "nav-09", hero: "hero-11", footer: "footer-07", palettes: ["dental-warm-ivory", "dental-navy-premium"], type: ["dental-type-premium"], density: "airy", imageStyle: "portrait-led", radius: "square", rhythm: "editorial", sections: [NAV, HERO, DOCTOR, TRUST, SERVICES, GALLERY, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["doctor portrait leads without overlapping text", "credentials collapse into compact proof list", "gallery is one-column with consistent captions", "CTA follows proof"], desktopRules: ["oversized doctor portrait", "editorial biography spread", "sparse navigation and large typography"] }),
  makeLayout({
    id: "dental-07-conversion-engine", name: "Consultation Engine", description: "High-intent lead generation layout optimized around treatment enquiry and appointment requests.", archetype: "conversion-lead-generation", tags: ["conversion", "lead-generation", "direct", "trust"], subindustries: ["implant-dentistry", "general-dentistry", "orthodontics"], goals: ["book appointment", "implant consultation", "consultation"], priorities: ["appointment", "location", "patient reviews"], nav: "nav-12", hero: "hero-09", footer: "footer-03", palettes: ["dental-clinical-blue", "dental-aqua-trust"], type: ["dental-type-clean"], density: "compact", imageStyle: "clinical", radius: "soft", rhythm: "conversion", sections: [NAV, HERO, TRUST, SERVICES, PROOF, PROCESS, DOCTOR, CTA, CONTACT, FOOTER], mobileRules: ["primary CTA is visible in first screenful", "proof appears before long treatment content", "all conversion buttons full width", "contact form single column"], desktopRules: ["proof-first hero", "high-scan treatment cards", "repeat conversion only after meaningful proof"] }),
  makeLayout({
    id: "dental-08-boutique-cosmetic", name: "Boutique Cosmetic", description: "Soft premium cosmetic clinic with restrained palette, refined typography and case-led storytelling.", archetype: "minimal-premium", tags: ["boutique", "cosmetic", "soft", "premium"], subindustries: ["cosmetic-dentistry"], goals: ["cosmetic consultation", "show outcomes"], priorities: ["visual outcomes", "confidence", "doctor expertise"], nav: "nav-16", hero: "hero-15", footer: "footer-07", palettes: ["dental-lavender-cosmetic", "dental-warm-ivory"], type: ["dental-type-premium"], density: "airy", imageStyle: "outcome-led", radius: "soft", rhythm: "minimal", sections: [NAV, HERO, GALLERY, DOCTOR, SERVICES, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["oversized display type scales down to max 3 lines", "case imagery uses full-bleed cards without text overlay", "secondary decoration is removed", "contact panel has normal document flow"], desktopRules: ["minimal typographic hero", "large case imagery", "very low card density", "quiet CTA treatment"] }),
  makeLayout({
    id: "dental-09-ortho-journey", name: "Ortho Journey", description: "Friendly modern orthodontic site focused on options, digital scanning and the treatment journey.", archetype: "conversion-lead-generation", tags: ["orthodontics", "friendly", "journey", "modern"], subindustries: ["orthodontics"], goals: ["consultation", "explain treatment journey"], priorities: ["treatment options", "journey", "doctor trust"], nav: "nav-02", hero: "hero-10", footer: "footer-04", palettes: ["dental-aqua-trust", "dental-sky-family"], type: ["dental-type-modern", "dental-type-humanist"], density: "balanced", imageStyle: "lifestyle", radius: "rounded", rhythm: "alternating", sections: [NAV, HERO, SERVICES, PROCESS, TECHNOLOGY, DOCTOR, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["treatment selector becomes vertical list", "journey steps remain sequential with no sideways rail", "scanner imagery stays below explanatory copy", "CTA remains full width"], desktopRules: ["service-selector hero", "horizontal treatment journey", "technology and doctor sections alternate"] }),
  makeLayout({
    id: "dental-10-emergency-trust", name: "Immediate Care", description: "Fast-scanning urgent dental layout centered on reassurance, access and direct contact.", archetype: "conversion-lead-generation", tags: ["urgent", "direct", "accessible", "reassuring"], subindustries: ["general-dentistry", "endodontics"], goals: ["book appointment", "urgent contact"], priorities: ["pain relief", "location", "appointment"], nav: "nav-02", hero: "hero-18", footer: "footer-04", palettes: ["dental-clinical-blue", "dental-aqua-trust"], type: ["dental-type-clean"], density: "compact", imageStyle: "clinical", radius: "soft", rhythm: "conversion", sections: [NAV, HERO, TRUST, SERVICES, PROCESS, DOCTOR, CTA, CONTACT, FOOTER], mobileRules: ["call and appointment actions are first-screen controls", "no carousel", "urgent service list uses large tap rows", "map/contact never overlays form"], desktopRules: ["offer-focus hero without fake urgency", "direct treatment list", "contact details visually prioritized"] }),
  makeLayout({
    id: "dental-11-editorial-clinic", name: "Dental Journal", description: "Editorial, architecture-inspired dental layout for premium clinics with strong photography.", archetype: "editorial-brand-led", tags: ["editorial", "architecture", "photography", "premium"], subindustries: ["cosmetic-dentistry", "implant-dentistry", "general-dentistry"], goals: ["build trust", "book appointment"], priorities: ["clinic technology", "doctor credentials", "visual outcomes"], nav: "nav-09", hero: "hero-05", footer: "footer-07", palettes: ["dental-warm-ivory", "dental-sage-wellness"], type: ["dental-type-premium"], density: "airy", imageStyle: "editorial", radius: "square", rhythm: "editorial", sections: [NAV, HERO, GALLERY, DOCTOR, SERVICES, TECHNOLOGY, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["all editorial offsets reset to zero", "index typography remains decorative but never exceeds viewport", "gallery alternates portrait and landscape without negative margins", "contact stacks"], desktopRules: ["asymmetric editorial grid", "clinic architecture imagery", "large section numbers and sparse copy"] }),
  makeLayout({
    id: "dental-12-wellness-calm", name: "Calm Dentistry", description: "Wellness-oriented dental experience focused on comfort, calm and patient reassurance.", archetype: "minimal-premium", tags: ["calm", "wellness", "natural", "warm"], subindustries: ["general-dentistry", "cosmetic-dentistry"], goals: ["build trust", "book appointment"], priorities: ["patient reviews", "doctor trust", "comfort"], nav: "nav-04", hero: "hero-03", footer: "footer-02", palettes: ["dental-sage-wellness", "dental-warm-ivory"], type: ["dental-type-humanist"], density: "airy", imageStyle: "lifestyle", radius: "rounded", rhythm: "minimal", sections: [NAV, HERO, TRUST, SERVICES, DOCTOR, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["centered hero becomes left-aligned for readability on narrow screens", "soft cards stack with generous gaps", "no fixed decorative elements", "forms use 16px minimum input text"], desktopRules: ["centered statement hero", "calm whitespace", "minimal proof cards"] }),
  makeLayout({
    id: "dental-13-implant-results", name: "Implant Results", description: "Evidence-led implant layout built around case confidence, process and advanced treatment planning.", archetype: "visual-image-led", tags: ["implant", "results", "evidence", "advanced"], subindustries: ["implant-dentistry"], goals: ["implant consultation", "show outcomes"], priorities: ["implant expertise", "technology", "treatment planning"], nav: "nav-01", hero: "hero-21", footer: "footer-10", palettes: ["dental-emerald-implant", "dental-navy-premium"], type: ["dental-type-modern"], density: "balanced", imageStyle: "outcome-led", radius: "soft", rhythm: "alternating", sections: [NAV, HERO, TRUST, GALLERY, SERVICES, TECHNOLOGY, PROCESS, DOCTOR, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["case result card becomes normal-flow block", "before/after imagery is clearly labeled and contained", "process becomes vertical", "proof metrics wrap to two columns maximum"], desktopRules: ["case-result hero", "outcome gallery immediately follows trust", "technology and process establish authority"] }),
  makeLayout({
    id: "dental-14-city-clinic", name: "City Clinic", description: "Contemporary urban clinic layout balancing location convenience, expertise and modern care.", archetype: "modern-experimental", tags: ["urban", "modern", "location", "clean"], subindustries: ["general-dentistry", "cosmetic-dentistry", "orthodontics"], goals: ["book appointment", "build trust"], priorities: ["location", "treatments", "technology"], nav: "nav-04", hero: "hero-20", footer: "footer-04", palettes: ["dental-clinical-blue", "dental-sage-wellness"], type: ["dental-type-modern"], density: "balanced", imageStyle: "editorial", radius: "soft", rhythm: "alternating", sections: [NAV, HERO, SERVICES, TECHNOLOGY, DOCTOR, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["map/location visual appears after headline and CTA", "map has fixed safe aspect ratio", "service grid stacks", "sticky navigation never covers anchored content"], desktopRules: ["location-led split hero", "modern card system", "clinic/location imagery integrated into contact"] }),
  makeLayout({
    id: "dental-15-smile-campaign", name: "Smile Campaign", description: "Bold high-energy cosmetic campaign layout for smile makeover and veneer consultations.", archetype: "conversion-lead-generation", tags: ["cosmetic", "bold", "campaign", "conversion"], subindustries: ["cosmetic-dentistry"], goals: ["cosmetic consultation", "show outcomes"], priorities: ["confidence", "visual outcomes", "consultation"], nav: "nav-14", hero: "hero-13", footer: "footer-03", palettes: ["dental-lavender-cosmetic", "dental-aqua-trust"], type: ["dental-type-modern"], density: "balanced", imageStyle: "outcome-led", radius: "rounded", rhythm: "conversion", sections: [NAV, HERO, GALLERY, SERVICES, PROOF, DOCTOR, CTA, CONTACT, FOOTER], mobileRules: ["color blocks become stacked sections rather than side-by-side", "headline stays within 11 words above fold where content allows", "gallery captions move below images if overlay would collide", "CTA buttons full width"], desktopRules: ["high-contrast color block hero", "campaign imagery", "strong mid-page proof-to-CTA transition"] }),
  makeLayout({
    id: "dental-16-multi-specialty", name: "Multi-Specialty Hub", description: "Structured clinic layout for larger teams and broad treatment portfolios without information overload.", archetype: "conversion-lead-generation", tags: ["multi-specialty", "structured", "professional", "scannable"], subindustries: ["general-dentistry", "implant-dentistry", "orthodontics", "endodontics"], goals: ["book appointment", "treatment discovery"], priorities: ["treatments", "doctor trust", "location"], nav: "nav-07", hero: "hero-10", footer: "footer-06", palettes: ["dental-clinical-blue", "dental-sky-family"], type: ["dental-type-clean"], density: "compact", imageStyle: "clinical", radius: "soft", rhythm: "alternating", sections: [NAV, HERO, SERVICES, DOCTOR, TECHNOLOGY, PROCESS, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["mega navigation converts to grouped mobile drawer", "treatments use accordion-like vertical groups instead of dense grid", "team uses one lead doctor plus compact list", "no nested horizontal scroll"], desktopRules: ["grouped navigation", "service taxonomy is primary content", "team and technology use compact structured grids"] }),
  makeLayout({
    id: "dental-17-photo-story", name: "Clinic Story", description: "Image-led storytelling layout for clinics with excellent interiors, team and lifestyle photography.", archetype: "visual-image-led", tags: ["story", "photography", "human", "visual"], subindustries: ["general-dentistry", "cosmetic-dentistry"], goals: ["build trust", "book appointment"], priorities: ["doctor trust", "clinic technology", "patient reviews"], nav: "nav-05", hero: "hero-04", footer: "footer-09", palettes: ["dental-sage-wellness", "dental-warm-ivory"], type: ["dental-type-humanist", "dental-type-premium"], density: "airy", imageStyle: "cinematic", radius: "soft", rhythm: "immersive", sections: [NAV, HERO, GALLERY, DOCTOR, SERVICES, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["cinematic hero uses safe 70svh maximum", "overlay copy gets strong contrast panel/gradient", "gallery uses single-column narrative", "floating navbar becomes standard sticky bar"], desktopRules: ["full-bleed cinematic opening", "storytelling photography between content blocks", "minimal card chrome"] }),
  makeLayout({
    id: "dental-18-proof-first", name: "Proof First", description: "Trust-heavy clinic layout that surfaces reviews, credentials and measurable confidence before deeper content.", archetype: "conversion-lead-generation", tags: ["proof", "reviews", "trust", "professional"], subindustries: ["general-dentistry", "implant-dentistry", "orthodontics"], goals: ["build trust", "book appointment"], priorities: ["patient reviews", "doctor credentials", "technology"], nav: "nav-01", hero: "hero-09", footer: "footer-02", palettes: ["dental-aqua-trust", "dental-clinical-blue"], type: ["dental-type-clean"], density: "balanced", imageStyle: "clinical", radius: "rounded", rhythm: "conversion", sections: [NAV, HERO, TRUST, PROOF, SERVICES, DOCTOR, TECHNOLOGY, CTA, CONTACT, FOOTER], mobileRules: ["trust metrics wrap safely at two columns", "reviews use stacked cards rather than carousel", "service content follows proof without large empty gaps", "CTA remains above contact form"], desktopRules: ["proof-first hero", "metrics and review wall near top", "treatments introduced after credibility established"] }),
  makeLayout({
    id: "dental-19-minimal-white", name: "Quiet Precision", description: "Extremely restrained modern dental layout relying on typography, spacing and selected photography.", archetype: "minimal-premium", tags: ["minimal", "precision", "quiet", "modern"], subindustries: ["cosmetic-dentistry", "implant-dentistry", "general-dentistry"], goals: ["build trust", "book appointment"], priorities: ["doctor trust", "treatments", "visual outcomes"], nav: "nav-16", hero: "hero-15", footer: "footer-02", palettes: ["dental-warm-ivory", "dental-clinical-blue"], type: ["dental-type-modern", "dental-type-premium"], density: "airy", imageStyle: "editorial", radius: "square", rhythm: "minimal", sections: [NAV, HERO, SERVICES, DOCTOR, GALLERY, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["typography is the visual system; no oversized overflow", "all sections remain normal flow", "gallery images use consistent edge-to-edge mobile treatment", "minimum side padding 18px"], desktopRules: ["very large typographic hierarchy", "few borders and cards", "wide whitespace with controlled content measure"] }),
  makeLayout({
    id: "dental-20-premium-complete", name: "Complete Signature", description: "Flagship balanced layout combining specialist authority, treatment discovery, technology, outcomes and conversion.", archetype: "editorial-brand-led", tags: ["flagship", "premium", "complete", "balanced"], subindustries: ["general-dentistry", "implant-dentistry", "cosmetic-dentistry", "orthodontics"], goals: ["book appointment", "build trust", "treatment discovery"], priorities: ["doctor trust", "treatments", "technology", "patient reviews"], nav: "nav-02", hero: "hero-14", footer: "footer-03", palettes: ["dental-navy-premium", "dental-clinical-blue", "dental-sage-wellness"], type: ["dental-type-modern", "dental-type-premium"], density: "balanced", imageStyle: "portrait-led", radius: "soft", rhythm: "alternating", sections: [NAV, HERO, TRUST, SERVICES, DOCTOR, TECHNOLOGY, GALLERY, PROCESS, PROOF, CTA, CONTACT, FOOTER], mobileRules: ["layered hero cards become inline proof blocks", "every desktop two-column section has an explicit content-first or media-first mobile order", "gallery never causes document overflow", "process is vertical", "contact and CTA are separated by clear rhythm"], desktopRules: ["layered premium hero", "balanced alternating media/content sections", "gallery and proof create visual midpoint", "strong final conversion"] }),
];

export const DENTAL_LAYOUT_LIBRARY_VERSION = 1;
export const DENTAL_LAYOUT_TARGET_COUNT = 20;
