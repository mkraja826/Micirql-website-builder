import type { AssetRecord } from "@micirql/assets";

export type PhysiotherapyDraftMediaRole =
  | "clinic-environment"
  | "arrival-access"
  | "equipment-detail"
  | "assessment"
  | "neutral-consultation"
  | "guided-movement"
  | "independent-movement"
  | "inclusive-movement";

type PhysiotherapyDraftMediaEntry = {
  asset: AssetRecord;
  role: PhysiotherapyDraftMediaRole;
  personContext: "none" | "illustrative-session" | "illustrative-movement";
  prohibitedFamilies: readonly ["team", "testimonials"];
};

export const PHYSIOTHERAPY_DRAFT_MEDIA_ENTRIES = [
  entry({
    id: "mi-physio-studio-reformers",
    photoId: "18075025",
    name: "Light movement studio",
    alt: "Empty light exercise studio with wooden reformer equipment",
    role: "clinic-environment",
    personContext: "none",
    focalPoint: { x: 0.52, y: 0.5 },
    tags: ["studio", "equipment", "interior", "no-people"],
  }),
  entry({
    id: "mi-physio-gym-yellow-ball",
    photoId: "17211446",
    name: "Accessible exercise room",
    alt: "Empty exercise room with strength equipment and a yellow exercise ball",
    role: "clinic-environment",
    personContext: "none",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["exercise-room", "equipment", "interior", "no-people"],
  }),
  entry({
    id: "mi-physio-cardio-room",
    photoId: "4716816",
    name: "Bright exercise equipment room",
    alt: "Bright empty room with exercise and cardio equipment on a wooden floor",
    role: "clinic-environment",
    personContext: "none",
    focalPoint: { x: 0.54, y: 0.5 },
    tags: ["exercise-room", "cardio", "interior", "no-people"],
  }),
  entry({
    id: "mi-physio-resistance-band-foot",
    photoId: "30483061",
    name: "Resistance band foot exercise",
    alt: "Close-up of an illustrative foot exercise using a resistance band",
    role: "equipment-detail",
    personContext: "illustrative-session",
    focalPoint: { x: 0.52, y: 0.56 },
    tags: ["resistance-band", "foot", "close-up", "exercise"],
  }),
  entry({
    id: "mi-physio-modern-clinic-room",
    photoId: "7016405",
    name: "Bright consultation room",
    alt: "Empty bright clinical consultation room with a desk and examination equipment",
    role: "clinic-environment",
    personContext: "none",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["clinic-room", "consultation-space", "interior", "no-people"],
  }),
  entry({
    id: "mi-physio-hand-putty",
    photoId: "30483024",
    name: "Hand exercise putty",
    alt: "Close-up of hands using exercise putty during an illustrative mobility activity",
    role: "equipment-detail",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["hands", "putty", "mobility", "close-up"],
  }),
  entry({
    id: "mi-physio-posture-assessment",
    photoId: "20860581",
    name: "Illustrative posture assessment",
    alt: "Illustrative posture assessment between a physiotherapist and an adult in a clinic",
    role: "guided-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.53, y: 0.45 },
    tags: ["assessment", "posture", "clinic", "illustrative"],
  }),
  entry({
    id: "mi-physio-guided-stretch",
    photoId: "20860619",
    name: "Illustrative guided stretch",
    alt: "Illustrative guided stretching exercise in a physiotherapy setting",
    role: "guided-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["stretch", "guided-movement", "clinic", "illustrative"],
  }),
  entry({
    id: "mi-physio-table-exercise",
    photoId: "20860580",
    name: "Illustrative table exercise",
    alt: "Illustrative rehabilitation exercise on a treatment table in a clinic",
    role: "guided-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.48, y: 0.48 },
    tags: ["exercise", "treatment-table", "clinic", "illustrative"],
  }),
  entry({
    id: "mi-physio-balance-ball",
    photoId: "7222400",
    name: "Balance ball movement",
    alt: "Adult practicing an illustrative balance movement with a large exercise ball",
    role: "independent-movement",
    personContext: "illustrative-movement",
    focalPoint: { x: 0.5, y: 0.42 },
    tags: ["balance", "exercise-ball", "movement", "illustrative"],
  }),
  entry({
    id: "mi-physio-inclusive-strength",
    photoId: "7294624",
    name: "Inclusive strength movement",
    alt: "Wheelchair user performing an illustrative dumbbell exercise in a gym",
    role: "inclusive-movement",
    personContext: "illustrative-movement",
    focalPoint: { x: 0.5, y: 0.42 },
    tags: ["wheelchair", "strength", "inclusive", "illustrative"],
  }),
  entry({
    id: "mi-physio-outdoor-band",
    photoId: "4970970",
    name: "Resistance band movement",
    alt: "Close-up of an adult performing an illustrative resistance band exercise outdoors",
    role: "independent-movement",
    personContext: "illustrative-movement",
    focalPoint: { x: 0.52, y: 0.52 },
    tags: ["resistance-band", "movement", "outdoors", "illustrative"],
  }),
] as const satisfies readonly PhysiotherapyDraftMediaEntry[];

/**
 * Candidate-stage pool. The reference draft intentionally continues to use
 * the stable 12-image subset above; Top-20 recipes can draw from this broader
 * role-tagged pool without making the current fixture exceed its 10–14 image
 * site-density contract.
 */
export const PHYSIOTHERAPY_CANDIDATE_MEDIA_ENTRIES = [
  ...PHYSIOTHERAPY_DRAFT_MEDIA_ENTRIES,
  entry({
    id: "mi-physio-quiet-waiting-area",
    photoId: "31377751",
    name: "Quiet waiting area",
    alt: "Empty healthcare waiting area with green seating and clear circulation space",
    role: "clinic-environment",
    personContext: "none",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["waiting-area", "arrival", "seating", "no-people"],
  }),
  entry({
    id: "mi-physio-landscaped-arrival",
    photoId: "33766834",
    name: "Landscaped building arrival",
    alt: "Aerial view of an illustrative modern building entrance with a landscaped forecourt",
    role: "arrival-access",
    personContext: "none",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["building-exterior", "arrival", "entryway", "no-people"],
  }),
  entry({
    id: "mi-physio-access-ramp",
    photoId: "12175607",
    name: "Accessible entrance ramp",
    alt: "Modern building entrance ramp with a metal handrail and level approach",
    role: "arrival-access",
    personContext: "none",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: [
      "access-ramp",
      "handrail",
      "entrance",
      "mobility-access",
      "no-people",
    ],
  }),
  entry({
    id: "mi-physio-floor-exercise-equipment",
    photoId: "6339729",
    name: "Floor exercise equipment",
    alt: "Exercise mats, light dumbbells, and skipping ropes arranged on a studio floor",
    role: "equipment-detail",
    personContext: "none",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: [
      "exercise-mat",
      "light-weights",
      "movement-tools",
      "close-up",
      "no-people",
    ],
  }),
  entry({
    id: "mi-physio-balance-board-feet",
    photoId: "30483062",
    name: "Balance board exercise",
    alt: "Close-up of an illustrative balance exercise using a wooden balance board",
    role: "equipment-detail",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.55 },
    tags: ["balance-board", "feet", "coordination", "close-up", "exercise"],
  }),
  entry({
    id: "mi-physio-shoulder-range-check",
    photoId: "30483023",
    name: "Shoulder range assessment",
    alt: "Close-up of an illustrative shoulder range-of-motion assessment",
    role: "assessment",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: ["shoulder", "range-of-motion", "assessment", "close-up"],
  }),
  entry({
    id: "mi-physio-forearm-assessment",
    photoId: "8313180",
    name: "Forearm mobility assessment",
    alt: "Illustrative forearm mobility assessment between a practitioner and an adult",
    role: "assessment",
    personContext: "illustrative-session",
    focalPoint: { x: 0.52, y: 0.48 },
    tags: ["forearm", "mobility-check", "assessment", "clinical-setting"],
  }),
  entry({
    id: "mi-physio-intake-notes",
    photoId: "7176076",
    name: "Consultation notes",
    alt: "Close-up of notes being recorded during an illustrative one-to-one consultation",
    role: "neutral-consultation",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: ["consultation", "clipboard", "notes", "conversation", "close-up"],
  }),
  entry({
    id: "mi-physio-guided-floor-mobility",
    photoId: "20860613",
    name: "Guided floor mobility",
    alt: "Two adults practicing an illustrative guided floor mobility exercise on mats",
    role: "guided-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: ["floor-exercise", "mobility", "exercise-mats", "guided-movement"],
  }),
  entry({
    id: "mi-physio-guided-leg-movement",
    photoId: "14797757",
    name: "Guided leg movement",
    alt: "Illustrative guided leg movement exercise in a bright rehabilitation setting",
    role: "guided-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.48 },
    tags: [
      "leg-mobility",
      "guided-exercise",
      "inclusive-representation",
      "clinic",
    ],
  }),
  entry({
    id: "mi-physio-guided-standing-stretch",
    photoId: "4662336",
    name: "Supported standing stretch",
    alt: "Two adults demonstrating an illustrative supported standing stretch",
    role: "guided-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: ["standing-stretch", "flexibility", "support", "movement"],
  }),
  entry({
    id: "mi-physio-form-guidance",
    photoId: "4587405",
    name: "Movement form guidance",
    alt: "Illustrative movement session with an instructor demonstrating exercise form",
    role: "guided-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: ["form-guidance", "exercise-mat", "movement-cue", "indoor"],
  }),
  entry({
    id: "mi-physio-home-mobility",
    photoId: "6975762",
    name: "Home mobility exercise",
    alt: "Older adult practicing an illustrative mobility exercise in a bright home",
    role: "independent-movement",
    personContext: "illustrative-movement",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: ["older-adult", "home-exercise", "mobility", "independent-movement"],
  }),
  entry({
    id: "mi-physio-active-aging-stretch",
    photoId: "33768798",
    name: "Active aging stretch",
    alt: "Older adult practicing an illustrative standing mobility stretch in a sports hall",
    role: "independent-movement",
    personContext: "illustrative-movement",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: [
      "active-aging",
      "standing-stretch",
      "mobility",
      "independent-movement",
    ],
  }),
  entry({
    id: "mi-physio-inclusive-cardio-guidance",
    photoId: "6551438",
    name: "Inclusive cardio guidance",
    alt: "Adult using a stationary bike during an illustrative supported movement session",
    role: "inclusive-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: ["body-inclusive", "stationary-bike", "guided-movement", "fitness"],
  }),
  entry({
    id: "mi-physio-chair-movement-group",
    photoId: "11674389",
    name: "Seated movement group",
    alt: "Group of older adults participating in an illustrative seated movement activity",
    role: "inclusive-movement",
    personContext: "illustrative-movement",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: ["older-adults", "chair-exercise", "group-movement", "inclusive"],
  }),
  entry({
    id: "mi-physio-adaptive-sport-conversation",
    photoId: "6249665",
    name: "Adaptive sport conversation",
    alt: "Wheelchair user discussing an illustrative movement activity with an instructor in a gym",
    role: "inclusive-movement",
    personContext: "illustrative-session",
    focalPoint: { x: 0.5, y: 0.45 },
    tags: [
      "wheelchair-user",
      "adaptive-sport",
      "consultation",
      "return-to-activity",
    ],
  }),
  entry({
    id: "mi-physio-planning-clipboard",
    photoId: "8155197",
    name: "Movement planning clipboard",
    alt: "Overhead view of exercise equipment with a blank clipboard for illustrative movement planning",
    role: "neutral-consultation",
    personContext: "none",
    focalPoint: { x: 0.5, y: 0.5 },
    tags: [
      "clipboard",
      "exercise-equipment",
      "planning",
      "overhead",
      "no-people",
    ],
  }),
] as const satisfies readonly PhysiotherapyDraftMediaEntry[];

export const PHYSIOTHERAPY_DRAFT_MEDIA_ASSETS =
  PHYSIOTHERAPY_DRAFT_MEDIA_ENTRIES.map((item) => item.asset);

export const PHYSIOTHERAPY_DRAFT_MEDIA_IDS =
  PHYSIOTHERAPY_DRAFT_MEDIA_ASSETS.map((asset) => asset.id);

export const PHYSIOTHERAPY_CANDIDATE_MEDIA_ASSETS =
  PHYSIOTHERAPY_CANDIDATE_MEDIA_ENTRIES.map((item) => item.asset);

export const PHYSIOTHERAPY_CANDIDATE_MEDIA_IDS =
  PHYSIOTHERAPY_CANDIDATE_MEDIA_ASSETS.map((asset) => asset.id);

function entry(input: {
  id: string;
  photoId: string;
  name: string;
  alt: string;
  role: PhysiotherapyDraftMediaRole;
  personContext: PhysiotherapyDraftMediaEntry["personContext"];
  focalPoint: AssetRecord["focalPoint"];
  tags: string[];
}): PhysiotherapyDraftMediaEntry {
  const sectionFamilies = ["hero", "about", "services", "features", "process"];
  return {
    role: input.role,
    personContext: input.personContext,
    prohibitedFamilies: ["team", "testimonials"],
    asset: {
      id: input.id,
      source: "micirql-placeholder",
      kind: "image",
      name: input.name,
      alt: input.alt,
      width: 1600,
      height: 1000,
      orientation: "landscape",
      aspectRatio: 1.6,
      focalPoint: input.focalPoint,
      domains: ["clinic"],
      subtypes: ["physiotherapy"],
      sectionFamilies,
      themes: ["organic", "minimalist", "editorial", "corporate"],
      tags: [
        "physiotherapy",
        "licensed",
        "pexels",
        "illustrative-not-clinic-staff",
        "no-outcome-claim",
        input.role,
        ...input.tags,
      ],
      license: "licensed",
      sourceReference: `https://www.pexels.com/photo/${input.photoId}/`,
      originalUrl: `https://images.pexels.com/photos/${input.photoId}/pexels-photo-${input.photoId}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=1600&h=1000`,
      variants: [],
      active: true,
      createdAt: "2026-10-18T00:00:00.000Z",
    },
  };
}
