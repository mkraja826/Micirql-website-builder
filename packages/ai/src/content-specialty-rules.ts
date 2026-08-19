import type { GroundingFacts } from "@micirql/design-engine";

export function buildSpecialtyContentRules(facts: GroundingFacts): string[] {
  const industry = clean(facts.industry);
  const subindustry = clean(facts.subindustry);
  const services = cleanList(facts.services);
  const goals = cleanList(facts.goals);
  const notes = clean(facts.notes);
  const allSignals = [industry, subindustry, ...services, ...goals, notes].filter(Boolean).join(" ");

  if (!/dental|dentist|dentistry|orthodont|endodont|implant|cosmetic|veneer|smile/.test(allSignals)) return [];

  const rules = [
    "DENTAL CONTENT MODE: write clinically specific, patient-readable copy grounded in the supplied specialty, services and goals. Do not fall back to generic dental slogans.",
    "When a dominant dental specialty is supplied, name that specialty or treatment family clearly in the hero or first substantive section instead of using a generic smile/care promise.",
    "Use the supplied services to differentiate treatment descriptions. Do not give every treatment the same benefits, wording or next step.",
    "Use concrete appointment CTAs such as Book a consultation, Request an appointment, Check availability or Call the clinic when those actions fit the supplied goals and existing targets.",
    "Never invent clinical outcomes, success rates, pain-free/painless claims, same-day treatment, guarantees, recovery times, implant brands, scanners, guided surgery, sedation, digital workflows or other technology unless supplied in the facts.",
    "Do not invent before/after results or patient stories. If proof is not supplied, use neutral wording that invites visitors to view verified cases or discuss suitability without claiming outcomes.",
    "Keep clinical language understandable. Prefer treatment name + patient decision context + concrete next step over promotional adjectives.",
  ];

  if (/implant/.test(allSignals)) {
    rules.push(
      "IMPLANT FOCUS: make dental implants unmistakably central when implants are a supplied priority; the hero should not read like a generic family-dentistry homepage.",
      "For implant-related process copy, neutral stages such as consultation, assessment, planning, treatment and review may be used only as process labels; do not imply a specific scan, surgery method, timeline or candidacy outcome unless supplied.",
      "Implant CTAs should favor consultation/assessment intent rather than vague actions like Learn more or Discover.",
    );
  }

  if (/cosmetic|smile|veneer/.test(allSignals)) {
    rules.push(
      "COSMETIC FOCUS: distinguish smile design, veneers, crowns and cosmetic treatment using supplied service names; avoid promising a perfect smile, guaranteed transformation or fabricated before/after outcomes.",
    );
  }

  if (/orthodont|aligner|braces/.test(allSignals)) {
    rules.push(
      "ORTHODONTIC FOCUS: use treatment-planning and consultation language grounded in supplied services; never assume aligner brands, treatment duration or suitability.",
    );
  }

  if (/endodont|root canal/.test(allSignals)) {
    rules.push(
      "ENDODONTIC FOCUS: explain the treatment purpose in neutral patient-readable language without promising pain elimination, single-visit completion or specific technology unless supplied.",
    );
  }

  return rules;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function cleanList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}
