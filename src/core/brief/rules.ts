import { NEVER_FABRICATE } from "./schema";

export const BRIEF_INTERPRETER_RULES = {
  principle:
    "Website quality must not depend on the user knowing how to write a good prompt.",
  minimumInputPolicy:
    "If industry or business type can be reasonably identified, generation may proceed without mandatory follow-up questions.",
  inferencePolicy: [
    "Use industry knowledge for structure, common goals, safe UX expectations and likely capabilities.",
    "Never convert an industry convention into a claimed fact about the business.",
    "Keep uncertain classifications explicit and allow multiple candidate directions to explore uncertainty.",
    "Unknown factual details remain unknown and must not be silently invented by content generation.",
    "A detailed brief increases personalization, not baseline quality.",
  ],
  neverFabricate: NEVER_FABRICATE,
} as const;

export const DEFAULT_WEBSITE_GOALS = {
  local_service: ["enquiry", "call", "visit"],
  clinic: ["appointment", "trust", "education"],
  restaurant: ["reservation", "menu", "visit"],
  hotel: ["booking", "experience", "enquiry"],
  ecommerce: ["discover_products", "purchase"],
  saas: ["understand_product", "signup", "demo"],
  real_estate: ["discover_properties", "lead", "enquiry"],
  recruitment: ["discover_jobs", "apply", "employer_lead"],
} as const;
