import type { ArtDirection } from "../art-direction/schema";

export type ArtDirectedNarrative = {
  hero: { eyebrow: string; headline: string; body: string; primary: string; secondary: string };
  services: { headline: string; intro: string };
  about: { headline: string; body: string };
  cta: { headline: string; body: string; primary: string; secondary: string };
  process: { headline: string };
  contact: { headline: string; body: string; submit: string };
  footer: string;
};

type NarrativeTone = {
  eyebrow: string;
  hero: string;
  body: string;
  services: string;
  about: string;
  cta: string;
  process: string;
  primary: string;
  secondary: string;
};

const TONES: Record<string, NarrativeTone> = {
  editorial: { eyebrow: "A considered introduction", hero: "Start with what matters most.", body: "Understand the offer, the context and the next step without unnecessary noise.", services: "The offer, explained with clarity.", about: "A clearer way to understand what this business stands for.", cta: "Begin with the question you already have.", process: "From first interest to a clearer next step.", primary: "Start an enquiry", secondary: "Explore more" },
  cinematic: { eyebrow: "An immersive introduction", hero: "Step into the experience before making the decision.", body: "Use atmosphere, context and focused information to make the next move feel more informed.", services: "Key reasons to continue the conversation.", about: "Create space for a more confident decision.", cta: "One clear action can be enough to begin.", process: "A deliberate path from interest to action.", primary: "Begin here", secondary: "Discover more" },
  "quiet-luxury": { eyebrow: "A refined introduction", hero: "Considered choices begin with clarity.", body: "A restrained presentation of the essentials, designed to make the next step feel simple and confident.", services: "Essential offerings, thoughtfully presented.", about: "Less noise. Better-informed decisions.", cta: "When you are ready, begin simply.", process: "A measured route from interest to action.", primary: "Enquire", secondary: "View more" },
  "warm-modern": { eyebrow: "A welcoming introduction", hero: "Start with a clearer, more comfortable first step.", body: "Plain language, useful context and a human path forward make the experience easier to navigate.", services: "What people come here for, made easier to understand.", about: "A more human way to understand the business.", cta: "Not sure where to begin? Start with the goal.", process: "A simple, reassuring path forward.", primary: "Start a conversation", secondary: "Explore" },
  "typography-led": { eyebrow: "START WITH CLARITY", hero: "UNDERSTAND FIRST. DECIDE SECOND.", body: "Clear information and a visible next action make complex choices easier to navigate.", services: "THE CORE OFFER. CLEARLY FRAMED.", about: "CLARITY BEFORE COMMITMENT.", cta: "ONE QUESTION. ONE CLEAR NEXT STEP.", process: "INTEREST → CONTEXT → ACTION", primary: "START HERE", secondary: "EXPLORE" },
  "conversion-focused": { eyebrow: "A direct path forward", hero: "Find the right place to start.", body: "Identify what you need, review the essentials and continue with a focused enquiry.", services: "Choose the option closest to your goal.", about: "Built to reduce friction between interest and action.", cta: "Know what you need? Continue now.", process: "Three steps from interest to enquiry.", primary: "Request contact", secondary: "Review options" },
  "gallery-led": { eyebrow: "A visual introduction", hero: "See the offer from a clearer point of view.", body: "A visual-first experience supported by grounded information and simple next steps.", services: "A visual guide to the core offer.", about: "Information should feel easy to take in.", cta: "Seen something relevant? Continue from there.", process: "From what you notice to what you do next.", primary: "Explore", secondary: "Start an enquiry" },
  "immersive-dark": { eyebrow: "A focused introduction", hero: "Clarity changes how the decision feels.", body: "Begin with the goal, understand the context and move forward without unnecessary claims or pressure.", services: "Clear paths into the offer.", about: "Confidence starts before the first conversation.", cta: "Move from uncertainty to a clearer next step.", process: "Interest. Context. Action.", primary: "Begin enquiry", secondary: "Explore" },
  "framed-minimal": { eyebrow: "The essentials", hero: "A clear frame for the first decision.", body: "Only what matters: the offer, useful context and a simple way to continue.", services: "The core offer. No unnecessary noise.", about: "Keep the first step simple.", cta: "Ready to continue? Start here.", process: "A simple three-part path.", primary: "Enquire", secondary: "Explore" },
  "soft-editorial": { eyebrow: "A thoughtful introduction", hero: "A gentler way to understand what comes next.", body: "Explore the essentials in a calm, readable way before deciding how to continue.", services: "A thoughtful introduction to the core offer.", about: "Better decisions begin with less pressure.", cta: "Take the next step at your own pace.", process: "A calm route from interest to conversation.", primary: "Send an enquiry", secondary: "Read more" },
  "clinical-refined": { eyebrow: "Clear, precise information", hero: "A more precise first conversation starts here.", body: "Understand the category, identify the goal and keep business-specific claims grounded in verified facts.", services: "Core offerings, clearly categorised.", about: "Precision starts with accurate expectations.", cta: "Turn the category into a focused enquiry.", process: "A structured route from interest to next step.", primary: "Submit enquiry", secondary: "Review options" },
  "human-narrative": { eyebrow: "Every decision starts somewhere", hero: "Begin with the part you already know.", body: "You do not need perfect language to start. A clear goal or concern is enough to move the conversation forward.", services: "Familiar reasons people begin the conversation.", about: "The first interaction should meet people where they are.", cta: "You do not need the perfect words to begin.", process: "From your question to a clearer conversation.", primary: "Start the conversation", secondary: "Explore" },
  "modern-heritage": { eyebrow: "A timeless introduction", hero: "Thoughtful decisions start with sound information.", body: "A straightforward approach to understanding the offer before moving into a personal conversation.", services: "Core offerings, presented with lasting clarity.", about: "Trust grows from what is stated carefully.", cta: "When the question is clear, the next step is simple.", process: "A considered path from interest to action.", primary: "Make an enquiry", secondary: "Explore" },
  "bold-contrast": { eyebrow: "START HERE", hero: "ASK BETTER. DECIDE CLEARER.", body: "Start with the goal. Get the context. Then continue with a direct next step.", services: "CLEAR STARTING POINTS.", about: "MAKE THE VALUE EASY TO SEE.", cta: "READY? MOVE FORWARD.", process: "GOAL → CONTEXT → ACTION", primary: "START NOW", secondary: "SEE MORE" },
  "calm-monochrome": { eyebrow: "A quiet introduction", hero: "Clarity without distraction.", body: "A restrained presentation of the essentials with a calm path to continue.", services: "What matters, presented simply.", about: "Confidence can come from restraint.", cta: "Continue when the next step feels clear.", process: "A quiet sequence from interest to action.", primary: "Enquire", secondary: "Explore" },
  "precision-grid": { eyebrow: "A structured introduction", hero: "Organise the decision around what matters.", body: "Clear categories, useful hierarchy and direct actions help people move forward with less friction.", services: "The offer, organised for faster understanding.", about: "Structure makes complex choices easier to navigate.", cta: "Choose the next action with context.", process: "A precise route from interest to action.", primary: "Continue", secondary: "Review" },
  "organic-premium": { eyebrow: "A natural introduction", hero: "A more considered way to begin.", body: "Warmth, context and useful information create a more confident path forward.", services: "The offer, presented with ease and depth.", about: "Good experiences feel thoughtful before they feel impressive.", cta: "Continue with the part that matters to you.", process: "A natural progression from interest to action.", primary: "Start an enquiry", secondary: "Discover more" },
  "statement-first": { eyebrow: "The essential idea", hero: "Make the value unmistakable.", body: "Lead with the strongest reason to care, then support it with enough context to act confidently.", services: "What the business does best.", about: "A clear point of view creates a stronger decision.", cta: "If the value is clear, make the next move simple.", process: "Statement. Proof. Action.", primary: "Take the next step", secondary: "Explore" },
  "layered-depth": { eyebrow: "A richer introduction", hero: "See the bigger picture without losing the next step.", body: "Layer story, offer and context so people can explore deeply while keeping the action clear.", services: "Multiple paths into the value.", about: "Depth works best when hierarchy stays clear.", cta: "Continue from the layer that matters most.", process: "Discover. Understand. Continue.", primary: "Continue", secondary: "Explore more" },
  "direct-modern": { eyebrow: "A direct introduction", hero: "Know the value. Know the next step.", body: "Crisp information and practical actions keep the experience fast, clear and useful.", services: "The offer without the detour.", about: "Modern experiences remove friction, not context.", cta: "Ready to continue? Make the next move obvious.", process: "A direct route from interest to action.", primary: "Get started", secondary: "Explore" },
};

const FALLBACK = TONES.editorial;

export function createArtDirectedNarrative(direction: ArtDirection): ArtDirectedNarrative {
  const tone = TONES[direction.visualStyle] ?? FALLBACK;
  return {
    hero: { eyebrow: tone.eyebrow, headline: tone.hero, body: tone.body, primary: tone.primary, secondary: tone.secondary },
    services: { headline: tone.services, intro: "A useful overview of the core offer, written to support clearer comparison and better next steps." },
    about: { headline: tone.about, body: "Present the business with grounded context and verified facts, without inventing credentials, outcomes, pricing or social proof." },
    cta: { headline: tone.cta, body: "Continue with a simple, relevant action based on the visitor's goal.", primary: tone.primary, secondary: tone.secondary },
    process: { headline: tone.process },
    contact: { headline: "Start with a simple enquiry.", body: "Share what you want to discuss. Verified contact details and submission infrastructure can be connected before publishing.", submit: "Send enquiry" },
    footer: "Clear information with a considered route to the next step.",
  };
}
