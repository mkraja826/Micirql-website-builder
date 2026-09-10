import { interpretMinimalBrief } from "../brief/interpreter";
import { createArtDirections } from "../art-direction/director";
import { directContent } from "../content/director";
import { compileThemeTokens, themeTokensToCssVariables } from "../theme/compiler";
import type { IndustryKnowledge } from "../industry/knowledge";
import { competeGenerationCandidates } from "./competition";

const PEARL_DENTAL_KNOWLEDGE: IndustryKnowledge = {
  industry: { slug: "dental", name: "Dental" },
  subIndustry: { slug: "general-dentistry", name: "General dentistry" },
  audience: ["prospective patients", "families seeking dental care"],
  recommendedPages: ["home", "about", "services", "contact"],
  requiredSectionTypes: ["navbar", "hero", "services", "about", "cta", "contact", "footer"],
  optionalSectionTypes: ["process", "faq", "gallery"],
  conversionActions: ["book appointment", "contact"],
  visualVocabulary: {
    traits: ["warm", "calm", "premium", "clinical-not-sterile", "human"],
    avoid: ["generic SaaS", "frightening procedure imagery", "cold hospital styling"],
  },
  imageryGuidance: ["calm modern dental clinic", "warm doctor-patient interaction", "natural smile lifestyle"],
  contentPriorities: ["reassurance and clarity", "care areas", "what to expect", "easy next step"],
  prohibitedAssumptions: ["doctor identities", "credentials", "ratings", "awards", "prices", "outcomes", "testimonials"],
  backendCapabilities: ["appointment", "contact"],
};

export async function generatePearlDentalBenchmark() {
  const brief = interpretMinimalBrief("Pearl Dental, Hyderabad");
  const directions = createArtDirections({
    industry: brief.business.industry.value,
    subIndustry: brief.business.subIndustry?.value,
    businessType: brief.business.businessType?.value,
    primaryGoal: brief.positioning.primaryGoal.value,
    secondaryGoals: brief.positioning.secondaryGoals.value,
    brandTraits: ["warm", "calm", "premium", "human"],
    knownFacts: brief.truth.knownFacts,
    unknownFacts: brief.truth.unknownFacts,
    industryKnowledge: {
      visualVocabulary: PEARL_DENTAL_KNOWLEDGE.visualVocabulary.traits as string[],
      imagery: PEARL_DENTAL_KNOWLEDGE.imageryGuidance,
      requiredSections: PEARL_DENTAL_KNOWLEDGE.requiredSectionTypes,
      optionalSections: PEARL_DENTAL_KNOWLEDGE.optionalSectionTypes,
      conversionActions: PEARL_DENTAL_KNOWLEDGE.conversionActions,
      avoid: PEARL_DENTAL_KNOWLEDGE.visualVocabulary.avoid as string[],
    },
  }, 20);
  const artDirection = directions[0];
  const content = await directContent({ brief, knowledge: PEARL_DENTAL_KNOWLEDGE });
  const theme = compileThemeTokens(brief, artDirection);
  const candidates = competeGenerationCandidates(brief, directions, 20);

  return {
    brief,
    knowledge: PEARL_DENTAL_KNOWLEDGE,
    artDirection,
    content,
    theme,
    cssVariables: themeTokensToCssVariables(theme),
    candidates,
    competitionWinner: candidates[0],
    selectedSections: {
      navbar: "navbar-conversion-clean",
      hero: "hero-editorial-split",
      services: "services-editorial-index",
      cta: "cta-editorial-band",
      contact: "contact-local-conversion",
      footer: "footer-functional-local",
    },
  };
}
