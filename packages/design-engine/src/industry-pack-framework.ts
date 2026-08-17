export type IndustryPalette = {
  id: string;
  label: string;
  personality: string[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    mutedText: string;
    border: string;
    darkSurface: string;
  };
  usage: {
    backgroundShare: [number, number];
    accentShareMax: number;
    darkSectionsMax: number;
  };
};

export type IndustryTypography = {
  id: string;
  label: string;
  mood: string[];
  display: string;
  body: string;
  ui: string;
};

export type IndustryCompositionRecipe = {
  id: string;
  label: string;
  goals: string[];
  personalities: string[];
  sections: string[];
  requiredFunctions: string[];
};

export type IndustrySubindustry = {
  id: string;
  label: string;
  keywords: string[];
  priorities: string[];
  preferredPaletteIds: string[];
  preferredTypographyIds: string[];
  preferredRecipeIds: string[];
  imageryProfile: string[];
  trustSignals: string[];
  conversionActions: string[];
};

export type IndustryDesignPack = {
  id: string;
  label: string;
  version: number;
  keywords: string[];
  subindustries: IndustrySubindustry[];
  palettes: IndustryPalette[];
  typography: IndustryTypography[];
  compositionRecipes: IndustryCompositionRecipe[];
  forbiddenPatterns: string[];
  mobileRules: string[];
  qaRules: string[];
};

const SANS = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const DENTAL_INDUSTRY_PACK: IndustryDesignPack = {
  id: "dental",
  label: "Dental",
  version: 1,
  keywords: ["dental", "dentist", "dentistry", "implant", "orthodont", "endodont", "prosthodont", "periodont"],
  palettes: [
    { id: "dental-clinical-blue", label: "Clinical Blue", personality: ["clean", "professional", "trustworthy"], colors: { primary: "#176B87", secondary: "#64CCC5", accent: "#DAFFFB", background: "#F7FBFC", surface: "#FFFFFF", surfaceAlt: "#EAF6F7", text: "#102A34", mutedText: "#5F737A", border: "#D7E7EA", darkSurface: "#0E4F63" }, usage: { backgroundShare: [55, 68], accentShareMax: 12, darkSectionsMax: 2 } },
    { id: "dental-aqua-trust", label: "Aqua Trust", personality: ["fresh", "friendly", "modern"], colors: { primary: "#0F8B8D", secondary: "#5BC0BE", accent: "#F4D35E", background: "#F8FCFB", surface: "#FFFFFF", surfaceAlt: "#E8F7F4", text: "#173B3B", mutedText: "#637676", border: "#D3E9E5", darkSurface: "#0A5C5D" }, usage: { backgroundShare: [55, 65], accentShareMax: 10, darkSectionsMax: 2 } },
    { id: "dental-sage-wellness", label: "Sage Wellness", personality: ["calm", "warm", "natural"], colors: { primary: "#4E7563", secondary: "#9BB8A8", accent: "#D8C7A3", background: "#FBFAF6", surface: "#FFFFFF", surfaceAlt: "#EEF3EE", text: "#26382F", mutedText: "#6C776F", border: "#DEE6DF", darkSurface: "#355345" }, usage: { backgroundShare: [52, 64], accentShareMax: 12, darkSectionsMax: 2 } },
    { id: "dental-navy-premium", label: "Navy Premium", personality: ["premium", "implant", "authoritative"], colors: { primary: "#17324D", secondary: "#2D6A8A", accent: "#D7B56D", background: "#F8F8F6", surface: "#FFFFFF", surfaceAlt: "#EDF2F5", text: "#17232D", mutedText: "#66717A", border: "#D8E0E5", darkSurface: "#10283D" }, usage: { backgroundShare: [50, 62], accentShareMax: 8, darkSectionsMax: 3 } },
    { id: "dental-lavender-cosmetic", label: "Lavender Cosmetic", personality: ["cosmetic", "elegant", "soft"], colors: { primary: "#665C8A", secondary: "#A59AC8", accent: "#E5C6D6", background: "#FCFAFD", surface: "#FFFFFF", surfaceAlt: "#F2EEF8", text: "#2C2738", mutedText: "#756E7D", border: "#E4DEEA", darkSurface: "#4A4268" }, usage: { backgroundShare: [52, 64], accentShareMax: 12, darkSectionsMax: 2 } },
    { id: "dental-warm-ivory", label: "Warm Ivory", personality: ["boutique", "warm", "premium"], colors: { primary: "#6A6257", secondary: "#A79277", accent: "#C9A86A", background: "#FBF8F2", surface: "#FFFFFF", surfaceAlt: "#F2ECE2", text: "#342F29", mutedText: "#756D64", border: "#E6DED2", darkSurface: "#51493F" }, usage: { backgroundShare: [50, 62], accentShareMax: 10, darkSectionsMax: 2 } },
    { id: "dental-emerald-implant", label: "Emerald Implant", personality: ["implant", "advanced", "confident"], colors: { primary: "#116466", secondary: "#2C8A7B", accent: "#D8B25C", background: "#F7FAF8", surface: "#FFFFFF", surfaceAlt: "#E8F2EE", text: "#183330", mutedText: "#61746F", border: "#D7E5DF", darkSurface: "#0D4B4C" }, usage: { backgroundShare: [50, 64], accentShareMax: 9, darkSectionsMax: 3 } },
    { id: "dental-sky-family", label: "Sky Family", personality: ["family", "approachable", "bright"], colors: { primary: "#3A86A8", secondary: "#8EC5D8", accent: "#F4C95D", background: "#F8FCFE", surface: "#FFFFFF", surfaceAlt: "#EAF5F9", text: "#1D3641", mutedText: "#687B84", border: "#D8E9EF", darkSurface: "#2A6078" }, usage: { backgroundShare: [58, 68], accentShareMax: 10, darkSectionsMax: 1 } },
  ],
  typography: [
    { id: "dental-type-clean", label: "Clean Clinical", mood: ["professional", "clean"], display: SANS, body: SANS, ui: SANS },
    { id: "dental-type-humanist", label: "Humanist Care", mood: ["warm", "friendly"], display: '"Avenir Next", Avenir, Inter, sans-serif', body: SANS, ui: SANS },
    { id: "dental-type-premium", label: "Premium Editorial", mood: ["premium", "boutique"], display: '"DM Serif Display", Georgia, serif', body: SANS, ui: SANS },
    { id: "dental-type-modern", label: "Modern Geometric", mood: ["modern", "advanced"], display: 'Montserrat, "Avenir Next", sans-serif', body: SANS, ui: SANS },
  ],
  compositionRecipes: [
    { id: "dental-recipe-general", label: "General Dental Trust", goals: ["book appointment", "build trust"], personalities: ["clean", "professional", "friendly"], sections: ["navbar", "hero", "trust-strip", "services", "doctor", "technology", "testimonials", "appointment-cta", "contact", "footer"], requiredFunctions: ["appointment.request", "call", "email"] },
    { id: "dental-recipe-implant", label: "Implant Authority", goals: ["implant consultation", "high-value treatment lead"], personalities: ["premium", "authoritative", "advanced"], sections: ["navbar", "hero", "implant-proof", "services", "doctor", "technology", "process", "testimonials", "appointment-cta", "contact", "footer"], requiredFunctions: ["appointment.request", "treatment.enquiry", "call"] },
    { id: "dental-recipe-cosmetic", label: "Cosmetic Confidence", goals: ["cosmetic consultation", "show outcomes"], personalities: ["elegant", "visual", "warm"], sections: ["navbar", "hero", "services", "before-after", "doctor", "testimonials", "financing", "appointment-cta", "contact", "footer"], requiredFunctions: ["appointment.request", "treatment.enquiry"] },
    { id: "dental-recipe-ortho", label: "Orthodontic Journey", goals: ["consultation", "explain treatment journey"], personalities: ["modern", "friendly"], sections: ["navbar", "hero", "services", "process", "doctor", "technology", "testimonials", "appointment-cta", "contact", "footer"], requiredFunctions: ["appointment.request", "call"] },
  ],
  subindustries: [
    { id: "general-dentistry", label: "General Dentistry", keywords: ["general dental", "family dental", "dentist"], priorities: ["treatments", "doctor trust", "location", "appointment"], preferredPaletteIds: ["dental-clinical-blue", "dental-aqua-trust", "dental-sky-family"], preferredTypographyIds: ["dental-type-clean", "dental-type-humanist"], preferredRecipeIds: ["dental-recipe-general"], imageryProfile: ["bright clinic interiors", "dentist with adult patient", "modern treatment room", "natural smiles"], trustSignals: ["doctor qualifications", "clinic technology", "patient reviews", "location"], conversionActions: ["Book appointment", "Call clinic", "Ask about treatment"] },
    { id: "implant-dentistry", label: "Implant Dentistry", keywords: ["implant", "prosthodont", "full mouth", "all-on-4", "all on 4"], priorities: ["implant expertise", "doctor credentials", "technology", "consultation"], preferredPaletteIds: ["dental-navy-premium", "dental-emerald-implant", "dental-clinical-blue"], preferredTypographyIds: ["dental-type-modern", "dental-type-premium"], preferredRecipeIds: ["dental-recipe-implant"], imageryProfile: ["implant consultation", "CBCT or digital planning", "premium clinic interior", "adult smile restoration"], trustSignals: ["implant credentials", "technology", "treatment planning", "verified reviews"], conversionActions: ["Book implant consultation", "Request assessment", "Call clinic"] },
    { id: "cosmetic-dentistry", label: "Cosmetic Dentistry", keywords: ["cosmetic", "veneers", "smile design", "smile makeover", "whitening"], priorities: ["visual outcomes", "doctor expertise", "confidence", "consultation"], preferredPaletteIds: ["dental-lavender-cosmetic", "dental-warm-ivory", "dental-navy-premium"], preferredTypographyIds: ["dental-type-premium", "dental-type-humanist"], preferredRecipeIds: ["dental-recipe-cosmetic"], imageryProfile: ["natural smile portraits", "consultation", "before and after when supplied", "boutique clinic interiors"], trustSignals: ["before and after cases", "doctor credentials", "verified reviews"], conversionActions: ["Book smile consultation", "View treatments", "Ask about veneers"] },
    { id: "orthodontics", label: "Orthodontics", keywords: ["orthodont", "braces", "aligner", "invisalign"], priorities: ["treatment options", "journey", "doctor trust", "consultation"], preferredPaletteIds: ["dental-aqua-trust", "dental-sky-family", "dental-clinical-blue"], preferredTypographyIds: ["dental-type-modern", "dental-type-clean"], preferredRecipeIds: ["dental-recipe-ortho"], imageryProfile: ["aligners or braces", "orthodontic consultation", "teen and adult smiles", "digital scanning"], trustSignals: ["orthodontic qualifications", "digital scanning", "patient reviews"], conversionActions: ["Book orthodontic consultation", "Ask about aligners"] },
    { id: "endodontics", label: "Endodontics / Root Canal", keywords: ["endodont", "root canal", "rct"], priorities: ["pain relief", "specialist trust", "technology", "urgent contact"], preferredPaletteIds: ["dental-clinical-blue", "dental-aqua-trust"], preferredTypographyIds: ["dental-type-clean"], preferredRecipeIds: ["dental-recipe-general"], imageryProfile: ["specialist consultation", "microscope or digital equipment", "calm treatment environment"], trustSignals: ["specialist qualification", "technology", "emergency availability when supplied"], conversionActions: ["Request appointment", "Call clinic"] },
  ],
  forbiddenPatterns: ["all-white page with no tonal rhythm", "black luxury fashion treatment", "unverified before/after claims", "fake doctor names", "generic stock-office imagery", "more than three consecutive white sections"],
  mobileRules: ["keep appointment CTA visible within first two screenfuls", "stack treatment cards without losing palette differentiation", "avoid horizontal carousels for critical treatment information", "keep phone and appointment actions thumb-reachable"],
  qaRules: ["must use at least two non-white surfaces", "must include a treatment/service section", "must include a trust signal section", "must include appointment or contact conversion", "must not render placeholder content", "must not repeat the same section family unless explicitly allowed"],
};

export const REAL_ESTATE_INDUSTRY_PACK: IndustryDesignPack = {
  id: "real-estate",
  label: "Real Estate",
  version: 1,
  keywords: ["real estate", "property", "properties", "realtor", "broker", "developer", "builder", "apartment", "villa", "commercial property"],
  palettes: [
    { id: "realestate-charcoal-stone", label: "Charcoal Stone", personality: ["architectural", "premium", "modern"], colors: { primary: "#2B2B2B", secondary: "#6F6A63", accent: "#C9A86A", background: "#F5F3EF", surface: "#FFFFFF", surfaceAlt: "#EAE6DF", text: "#222222", mutedText: "#6E6A65", border: "#DDD7CE", darkSurface: "#1D1D1D" }, usage: { backgroundShare: [42, 58], accentShareMax: 8, darkSectionsMax: 4 } },
    { id: "realestate-sand-olive", label: "Sand & Olive", personality: ["residential", "warm", "lifestyle"], colors: { primary: "#5D6B58", secondary: "#A69F88", accent: "#C89B5B", background: "#F7F4ED", surface: "#FFFFFF", surfaceAlt: "#ECE8DD", text: "#2E302C", mutedText: "#716F68", border: "#DED8CA", darkSurface: "#3E493B" }, usage: { backgroundShare: [45, 60], accentShareMax: 10, darkSectionsMax: 3 } },
    { id: "realestate-navy-brass", label: "Navy & Brass", personality: ["luxury", "developer", "authoritative"], colors: { primary: "#172B3A", secondary: "#3D5362", accent: "#B9924E", background: "#F6F7F7", surface: "#FFFFFF", surfaceAlt: "#E8ECEF", text: "#1D2730", mutedText: "#68737B", border: "#D8DEE2", darkSurface: "#0F202C" }, usage: { backgroundShare: [40, 56], accentShareMax: 8, darkSectionsMax: 4 } },
    { id: "realestate-terracotta", label: "Terracotta Urban", personality: ["urban", "editorial", "distinctive"], colors: { primary: "#8A4F3D", secondary: "#C47A5A", accent: "#D6B36A", background: "#FAF5F0", surface: "#FFFFFF", surfaceAlt: "#F1E5DD", text: "#372B27", mutedText: "#776A64", border: "#E5D6CE", darkSurface: "#603529" }, usage: { backgroundShare: [44, 58], accentShareMax: 10, darkSectionsMax: 3 } },
  ],
  typography: [
    { id: "realestate-type-editorial", label: "Architectural Editorial", mood: ["luxury", "editorial"], display: '"DM Serif Display", Georgia, serif', body: SANS, ui: SANS },
    { id: "realestate-type-modern", label: "Modern Property", mood: ["modern", "clean"], display: 'Montserrat, "Avenir Next", sans-serif', body: SANS, ui: SANS },
    { id: "realestate-type-humanist", label: "Residential Warm", mood: ["warm", "lifestyle"], display: '"Avenir Next", Avenir, Inter, sans-serif', body: SANS, ui: SANS },
  ],
  compositionRecipes: [
    { id: "realestate-recipe-developer", label: "Residential Developer", goals: ["project enquiries", "site visits"], personalities: ["premium", "architectural"], sections: ["navbar", "hero", "featured-projects", "locations", "amenities", "gallery", "developer-proof", "testimonials", "site-visit-cta", "contact", "footer"], requiredFunctions: ["property.enquiry", "sitevisit.request", "call"] },
    { id: "realestate-recipe-broker", label: "Broker Listings", goals: ["property leads", "search"], personalities: ["modern", "practical"], sections: ["navbar", "property-search", "featured-properties", "property-types", "locations", "agent", "testimonials", "enquiry-cta", "contact", "footer"], requiredFunctions: ["property.search", "property.enquiry", "callback.request"] },
    { id: "realestate-recipe-luxury", label: "Luxury Property Showcase", goals: ["high-value enquiries", "showcase"], personalities: ["luxury", "editorial", "visual"], sections: ["navbar", "hero", "signature-properties", "gallery", "locations", "agent", "proof", "private-viewing-cta", "contact", "footer"], requiredFunctions: ["property.enquiry", "privateviewing.request"] },
  ],
  subindustries: [
    { id: "residential-developer", label: "Residential Developer", keywords: ["developer", "builder", "residential project", "apartments", "villas"], priorities: ["projects", "location", "amenities", "developer trust", "site visit"], preferredPaletteIds: ["realestate-navy-brass", "realestate-sand-olive", "realestate-charcoal-stone"], preferredTypographyIds: ["realestate-type-modern", "realestate-type-editorial"], preferredRecipeIds: ["realestate-recipe-developer"], imageryProfile: ["project exteriors", "interiors", "aerial views", "amenities", "neighborhood context"], trustSignals: ["RERA when supplied", "completed projects", "developer history", "project status"], conversionActions: ["Schedule site visit", "Enquire now", "Download brochure"] },
    { id: "broker-realtor", label: "Broker / Realtor", keywords: ["broker", "realtor", "agent", "property consultant"], priorities: ["listings", "search", "location", "agent credibility", "lead capture"], preferredPaletteIds: ["realestate-charcoal-stone", "realestate-sand-olive"], preferredTypographyIds: ["realestate-type-modern", "realestate-type-humanist"], preferredRecipeIds: ["realestate-recipe-broker"], imageryProfile: ["property exteriors", "interiors", "agent portrait", "neighborhoods"], trustSignals: ["verified listings", "agent experience when supplied", "client reviews"], conversionActions: ["Enquire about property", "Request callback", "Talk to agent"] },
    { id: "luxury-properties", label: "Luxury Properties", keywords: ["luxury property", "luxury villa", "premium property", "ultra luxury"], priorities: ["visual showcase", "privacy", "location", "high-value lead"], preferredPaletteIds: ["realestate-navy-brass", "realestate-charcoal-stone", "realestate-terracotta"], preferredTypographyIds: ["realestate-type-editorial"], preferredRecipeIds: ["realestate-recipe-luxury"], imageryProfile: ["cinematic exteriors", "premium interiors", "aerial photography", "lifestyle details"], trustSignals: ["property details", "location", "developer or agent reputation"], conversionActions: ["Request private viewing", "Enquire discreetly"] },
  ],
  forbiddenPatterns: ["clinic-style trust layout", "generic services cards as primary content", "no property imagery", "appointment language", "excessively medical blue palette", "listing grids without location or property context"],
  mobileRules: ["property imagery must remain prominent", "search/filter controls must be usable one-handed", "site-visit/enquiry CTA must remain visible", "avoid shrinking property facts into unreadable grids"],
  qaRules: ["must show property or project imagery", "must expose a property-specific conversion action", "must include location context", "must not use dental/medical section semantics", "must not render placeholder listings as real inventory"],
};

export const INDUSTRY_DESIGN_PACKS: IndustryDesignPack[] = [DENTAL_INDUSTRY_PACK, REAL_ESTATE_INDUSTRY_PACK];

export function resolveIndustryDesignPack(industry?: string, subindustry?: string): IndustryDesignPack | undefined {
  const value = `${industry ?? ""} ${subindustry ?? ""}`.trim().toLowerCase();
  return INDUSTRY_DESIGN_PACKS.find((pack) => pack.keywords.some((keyword) => value.includes(keyword)));
}

export function resolveIndustrySubindustry(pack: IndustryDesignPack, industry?: string, subindustry?: string): IndustrySubindustry | undefined {
  const value = `${industry ?? ""} ${subindustry ?? ""}`.trim().toLowerCase();
  return pack.subindustries
    .map((candidate) => ({ candidate, score: candidate.keywords.reduce((total, keyword) => total + (value.includes(keyword) ? keyword.length : 0), 0) }))
    .sort((a, b) => b.score - a.score)[0]?.candidate;
}
