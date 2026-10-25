import type {
  ImageStrategy,
  ThemeFamily,
  TypographyStrategy,
} from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";

export const PHYSIOTHERAPY_CANDIDATE_BLUEPRINT_VERSION =
  "physiotherapy-blueprints-2026.10.18" as const;

type HomeFlowFamily = Extract<
  SectionFamily,
  "services" | "features" | "process" | "contact" | "cta"
>;

export type PhysiotherapyCandidateBlueprint = {
  id: `clinic-physiotherapy-${string}`;
  recipeId: string;
  name: string;
  thesis: string;
  themeFamily: ThemeFamily;
  typographyStrategy: TypographyStrategy;
  imageStrategy: ImageStrategy;
  palette: {
    primary: `#${string}`;
    secondary: `#${string}`;
    accent: `#${string}`;
    background: `#${string}`;
    surface: `#${string}`;
  };
  homeFlow: readonly HomeFlowFamily[];
  navigationComposition: string;
  heroComposition: string;
  openingComposition: string;
  cardSystem: string;
  processVisualization: string;
  surfaceRhythm: string;
  conversionPattern: string;
  imageTreatment: string;
  mobileReflow: string;
  motifs: readonly string[];
  requiredFacts: readonly ("location" | "opening-hours")[];
  variantSeed: number;
};

const stableMobileRule =
  "Collapse to semantic copy-first single column by 390px; remove overlap, masks and diagonals from the reading path; keep actions at least 44px and preserve a sentence-case 600–700 H1.";

function blueprint(
  value: Omit<PhysiotherapyCandidateBlueprint, "id" | "mobileReflow"> & {
    mobileReflow?: string;
  },
): PhysiotherapyCandidateBlueprint {
  return {
    ...value,
    id: `clinic-physiotherapy-${value.recipeId}`,
    mobileReflow: value.mobileReflow ?? stableMobileRule,
  };
}

export const PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS = [
  blueprint({
    recipeId: "movement-pathway",
    name: "Movement Pathway",
    thesis:
      "A calm guided route connects the first question, service comparison and assessment request.",
    themeFamily: "organic",
    typographyStrategy: "humanist-sans",
    imageStrategy: "documentary",
    palette: {
      primary: "#176B87",
      secondary: "#12324A",
      accent: "#C96A35",
      background: "#F7FAFC",
      surface: "#FFFFFF",
    },
    homeFlow: ["services", "features", "process", "contact", "cta"],
    navigationComposition: "quiet capsule rail with action before brand",
    heroComposition: "offset 5/7 image-first organic split",
    openingComposition: "movement arc linking image and proposition",
    cardSystem: "staggered exercise cards with circular indices",
    processVisualization: "dashed connected assessment path",
    surfaceRhythm: "soft rounded fields with alternating asymmetry",
    conversionPattern: "service clarity then three-step request path",
    imageTreatment: "organic 5:4 documentary crop with offset shadow",
    motifs: ["movement-arc", "staggered-cadence", "connected-path"],
    requiredFacts: [],
    variantSeed: 1,
  }),
  blueprint({
    recipeId: "mobility-atlas",
    name: "Mobility Atlas",
    thesis:
      "Wayfinding cues turn clinic access and movement choices into a readable local map.",
    themeFamily: "editorial",
    typographyStrategy: "humanist-sans",
    imageStrategy: "restrained",
    palette: {
      primary: "#285A4A",
      secondary: "#243C35",
      accent: "#D39A3A",
      background: "#F5F6F0",
      surface: "#FFFFFF",
    },
    homeFlow: ["features", "services", "process", "cta", "contact"],
    navigationComposition: "wayfinding rail with location marker",
    heroComposition: "centered panoramic environment frame",
    openingComposition: "contour lines and coordinate labels",
    cardSystem: "map-key cards with route labels",
    processVisualization: "horizontal route with named stops",
    surfaceRhythm: "broad landscape bands and inset map panels",
    conversionPattern: "orient visitor before service selection",
    imageTreatment: "wide environment and access crops",
    motifs: ["route-contours", "coordinate-ticks", "map-key"],
    requiredFacts: ["location"],
    variantSeed: 2,
  }),
  blueprint({
    recipeId: "assessment-blueprint",
    name: "Assessment Blueprint",
    thesis:
      "Measured, factual annotations explain the assessment journey without making outcome claims.",
    themeFamily: "corporate",
    typographyStrategy: "technical",
    imageStrategy: "product-detail",
    palette: {
      primary: "#183B56",
      secondary: "#102B3E",
      accent: "#2E92A5",
      background: "#F3F7F9",
      surface: "#FFFFFF",
    },
    homeFlow: ["process", "services", "features", "contact", "cta"],
    navigationComposition: "compact datum bar with section ticks",
    heroComposition: "text-first 7/5 split with inset image",
    openingComposition: "measurement rail and annotation tabs",
    cardSystem: "labelled blueprint panels",
    processVisualization: "numbered measurement checkpoints",
    surfaceRhythm: "strict grid with precise inset rules",
    conversionPattern: "show assessment steps before service options",
    imageTreatment: "equipment details with controlled rectangular crops",
    motifs: ["measurement-rail", "annotation-tabs", "datum-grid"],
    requiredFacts: [],
    variantSeed: 3,
  }),
  blueprint({
    recipeId: "recovery-journal",
    name: "Recovery Journal",
    thesis:
      "An editorial notebook helps visitors prepare questions without implying a recovery timeline.",
    themeFamily: "editorial",
    typographyStrategy: "editorial-serif",
    imageStrategy: "documentary",
    palette: {
      primary: "#355848",
      secondary: "#2D3B34",
      accent: "#B56B48",
      background: "#F6F0E5",
      surface: "#FFFDF8",
    },
    homeFlow: ["features", "process", "services", "cta", "contact"],
    navigationComposition: "editorial masthead with slim action tab",
    heroComposition: "note card overlapping a 4:5 image",
    openingComposition: "margin rules and factual preparation notes",
    cardSystem: "journal entries with caption rails",
    processVisualization: "undated entry sequence, never progress claims",
    surfaceRhythm: "paper fields, margins and quiet ruled dividers",
    conversionPattern: "prepare questions then request assessment",
    imageTreatment: "warm documentary crops with factual captions",
    motifs: ["margin-rule", "note-tab", "caption-rail"],
    requiredFacts: [],
    variantSeed: 4,
  }),
  blueprint({
    recipeId: "active-studio",
    name: "Active Studio",
    thesis:
      "A high-energy studio composition foregrounds active movement while keeping clinical language calm.",
    themeFamily: "maximalist",
    typographyStrategy: "geometric-modern",
    imageStrategy: "immersive",
    palette: {
      primary: "#223034",
      secondary: "#172326",
      accent: "#8BAA36",
      background: "#F4F5EE",
      surface: "#FFFFFF",
    },
    homeFlow: ["services", "process", "features", "cta", "contact"],
    navigationComposition: "dark studio rail with compact bright action",
    heroComposition: "full-width horizontal image with diagonal copy dock",
    openingComposition: "kinetic band crossing one image edge",
    cardSystem: "large numbered studio tiles",
    processVisualization: "bold horizontal steps with clear labels",
    surfaceRhythm: "alternating full-bleed and compact utility bands",
    conversionPattern: "service-first active journey",
    imageTreatment: "dynamic wide movement crops",
    motifs: ["kinetic-band", "studio-dock", "large-numerals"],
    requiredFacts: [],
    variantSeed: 5,
  }),
  blueprint({
    recipeId: "calm-arrival",
    name: "Calm Arrival",
    thesis:
      "A low-pressure arrival sequence answers practical questions before explaining the assessment path.",
    themeFamily: "minimalist",
    typographyStrategy: "humanist-sans",
    imageStrategy: "restrained",
    palette: {
      primary: "#315F73",
      secondary: "#294A59",
      accent: "#C79A6B",
      background: "#F5F8F7",
      surface: "#FFFFFF",
    },
    homeFlow: ["features", "services", "contact", "process", "cta"],
    navigationComposition: "minimal centered rail with quiet text links",
    heroComposition: "centered proposition over a quiet framed image",
    openingComposition: "breathing ring around the image window",
    cardSystem: "low-contrast information panels",
    processVisualization: "soft divided first-visit sequence",
    surfaceRhythm: "generous calm fields with bounded copy measure",
    conversionPattern: "reduce uncertainty before requesting a visit",
    imageTreatment: "soft clinic environment frames",
    motifs: ["breathing-ring", "soft-divider", "arrival-window"],
    requiredFacts: [],
    variantSeed: 6,
  }),
  blueprint({
    recipeId: "functional-grid",
    name: "Functional Grid",
    thesis:
      "A disciplined utility grid makes services, access and next steps fast to compare.",
    themeFamily: "corporate",
    typographyStrategy: "corporate-sans",
    imageStrategy: "product-detail",
    palette: {
      primary: "#354753",
      secondary: "#263640",
      accent: "#237A73",
      background: "#F4F7F7",
      surface: "#FFFFFF",
    },
    homeFlow: ["services", "contact", "process", "features", "cta"],
    navigationComposition: "12-column utility header",
    heroComposition: "strict grid without floating hero card",
    openingComposition: "baseline grid and checkpoint chips",
    cardSystem: "rectilinear functional modules",
    processVisualization: "checkpoint row with solid connectors",
    surfaceRhythm: "compact grid, short gaps and hard alignment",
    conversionPattern: "compare, locate, understand, request",
    imageTreatment: "functional movement details in square frames",
    motifs: ["baseline-grid", "checkpoint-chip", "utility-module"],
    requiredFacts: [],
    variantSeed: 7,
  }),
  blueprint({
    recipeId: "guided-milestones",
    name: "Guided Milestones",
    thesis:
      "The first-visit journey leads the page through connected, non-outcome milestones.",
    themeFamily: "organic",
    typographyStrategy: "geometric-modern",
    imageStrategy: "people-led",
    palette: {
      primary: "#2C5AA0",
      secondary: "#203F70",
      accent: "#D9825B",
      background: "#F5F7FB",
      surface: "#FFFFFF",
    },
    homeFlow: ["process", "features", "services", "cta", "contact"],
    navigationComposition: "milestone rail with active starting node",
    heroComposition: "split image integrated with vertical step rail",
    openingComposition: "first numbered node begins beside the proposition",
    cardSystem: "milestone panels alternating around a path",
    processVisualization: "connected numbered nodes",
    surfaceRhythm: "alternating side-to-side milestone cadence",
    conversionPattern: "explain what happens before asking for contact",
    imageTreatment: "guided exercise imagery with directional crops",
    motifs: ["milestone-node", "vertical-rail", "path-turn"],
    requiredFacts: [],
    variantSeed: 8,
  }),
  blueprint({
    recipeId: "local-access",
    name: "Local Access",
    thesis:
      "Location, arrival and accessibility facts lead a practical local clinic experience.",
    themeFamily: "playful",
    typographyStrategy: "friendly-rounded",
    imageStrategy: "documentary",
    palette: {
      primary: "#9A4F3F",
      secondary: "#5A3A34",
      accent: "#5A8FA6",
      background: "#FBF7F2",
      surface: "#FFFFFF",
    },
    homeFlow: ["contact", "services", "features", "process", "cta"],
    navigationComposition: "local route strip with address cue",
    heroComposition: "arrival image paired with compact local proposition",
    openingComposition: "route pin and walking-line motif",
    cardSystem: "practical access cards",
    processVisualization: "arrival-to-assessment route",
    surfaceRhythm: "short local information bands",
    conversionPattern: "establish access before service choice",
    imageTreatment: "exterior, entrance and accessible environment crops",
    motifs: ["route-pin", "walking-line", "arrival-strip"],
    requiredFacts: ["location"],
    variantSeed: 9,
  }),
  blueprint({
    recipeId: "clinical-notebook",
    name: "Clinical Notebook",
    thesis:
      "A restrained factual notebook makes visit preparation and service information explicit.",
    themeFamily: "editorial",
    typographyStrategy: "editorial-serif",
    imageStrategy: "product-detail",
    palette: {
      primary: "#1E2C3A",
      secondary: "#17222D",
      accent: "#D97732",
      background: "#F7F2E8",
      surface: "#FFFEFA",
    },
    homeFlow: ["features", "contact", "services", "process", "cta"],
    navigationComposition: "notebook index tabs",
    heroComposition: "ruled two-column opening with pinned photo corner",
    openingComposition: "factual annotation labels on ruled lines",
    cardSystem: "indexed note blocks",
    processVisualization: "annotated assessment checklist",
    surfaceRhythm: "paper sheets and fine ruled intervals",
    conversionPattern: "prepare practical details before service exploration",
    imageTreatment: "assessment details with restrained pinned crops",
    motifs: ["ruled-line", "pinned-corner", "index-tab"],
    requiredFacts: [],
    variantSeed: 10,
  }),
  blueprint({
    recipeId: "arc-and-anchor",
    name: "Arc and Anchor",
    thesis:
      "A strong anchored proposition is balanced by a tall human movement frame.",
    themeFamily: "luxury",
    typographyStrategy: "geometric-modern",
    imageStrategy: "editorial-crop",
    palette: {
      primary: "#67445D",
      secondary: "#493140",
      accent: "#D9A8A2",
      background: "#FAF5F6",
      surface: "#FFFFFF",
    },
    homeFlow: ["services", "features", "contact", "process", "cta"],
    navigationComposition: "fine-line header with anchored action dot",
    heroComposition: "tall arch image with compact lower-left copy",
    openingComposition: "anchor dot and curved section edge",
    cardSystem: "arched image cards with grounded text",
    processVisualization: "curved anchor path",
    surfaceRhythm: "tall vertical pauses and grounded text blocks",
    conversionPattern: "service confidence then practical contact",
    imageTreatment: "portrait-oriented human movement crops",
    motifs: ["tall-arch", "anchor-dot", "curved-edge"],
    requiredFacts: [],
    variantSeed: 11,
  }),
  blueprint({
    recipeId: "range-of-motion",
    name: "Range of Motion",
    thesis:
      "Wide motion framing and angle markers communicate breadth of movement without measuring progress.",
    themeFamily: "cinematic",
    typographyStrategy: "humanist-sans",
    imageStrategy: "immersive",
    palette: {
      primary: "#3F4F85",
      secondary: "#303B62",
      accent: "#77A994",
      background: "#F3F5F8",
      surface: "#FFFFFF",
    },
    homeFlow: ["features", "contact", "process", "services", "cta"],
    navigationComposition: "wide cinematic rail",
    heroComposition: "headline above an ultra-wide motion frame",
    openingComposition: "angle markers around a sequential crop",
    cardSystem: "wide sequence frames with bounded copy",
    processVisualization: "motion frames ordered as visit steps",
    surfaceRhythm: "panoramic fields alternating with compact text",
    conversionPattern: "questions and access before service detail",
    imageTreatment: "wide movement sequences with one asset per frame",
    motifs: ["angle-marker", "motion-frame", "sequence-tick"],
    requiredFacts: [],
    variantSeed: 12,
  }),
  blueprint({
    recipeId: "step-by-step",
    name: "Step by Step",
    thesis:
      "Large readable step numbers make the first assessment journey the primary story.",
    themeFamily: "minimalist",
    typographyStrategy: "technical",
    imageStrategy: "restrained",
    palette: {
      primary: "#2F5B46",
      secondary: "#253F33",
      accent: "#C1765A",
      background: "#F5F6F1",
      surface: "#FFFFFF",
    },
    homeFlow: ["process", "services", "contact", "features", "cta"],
    navigationComposition: "compact sequential index header",
    heroComposition: "oversized readable 01 beside a narrow image strip",
    openingComposition: "vertical numbering starts the page path",
    cardSystem: "step panels on a shared baseline",
    processVisualization: "solid vertical path with large numerals",
    surfaceRhythm: "compact step bands separated by open breathing space",
    conversionPattern: "process first, then service and practical details",
    imageTreatment: "narrow first-visit and assessment crops",
    motifs: ["large-step", "solid-path", "narrow-strip"],
    requiredFacts: [],
    variantSeed: 13,
  }),
  blueprint({
    recipeId: "kinetic-bands",
    name: "Kinetic Bands",
    thesis:
      "Layered horizontal energy bands distinguish active care without sacrificing readability.",
    themeFamily: "maximalist",
    typographyStrategy: "geometric-modern",
    imageStrategy: "editorial-crop",
    palette: {
      primary: "#173D63",
      secondary: "#102B47",
      accent: "#E6783A",
      background: "#F3F6F8",
      surface: "#FFFFFF",
    },
    homeFlow: ["services", "cta", "process", "features", "contact"],
    navigationComposition: "banded header with offset action block",
    heroComposition: "image-first split with offset horizontal bands",
    openingComposition: "copy block crossing the band edge",
    cardSystem: "offset blocks with horizontal energy rules",
    processVisualization: "band segments labelled as assessment stages",
    surfaceRhythm: "compressed energetic bands then open detail fields",
    conversionPattern: "early request option followed by detailed process",
    imageTreatment: "tight dynamic movement crops",
    motifs: ["speed-band", "offset-block", "energy-rule"],
    requiredFacts: [],
    variantSeed: 14,
  }),
  blueprint({
    recipeId: "balance-field",
    name: "Balance Field",
    thesis:
      "Paired visual fields balance movement information and practical next steps without mirrored patient claims.",
    themeFamily: "organic",
    typographyStrategy: "humanist-sans",
    imageStrategy: "people-led",
    palette: {
      primary: "#53654B",
      secondary: "#3B4937",
      accent: "#B98A37",
      background: "#F7F4EA",
      surface: "#FFFFFF",
    },
    homeFlow: ["features", "process", "services", "contact", "cta"],
    navigationComposition: "balanced two-zone header",
    heroComposition: "bilateral color field balancing one image",
    openingComposition: "central balance line with paired blocks",
    cardSystem: "paired information cards around a shared axis",
    processVisualization: "balanced checkpoints on one line",
    surfaceRhythm: "alternating paired and single anchored fields",
    conversionPattern: "clarify goals and process before service selection",
    imageTreatment: "single functional movement image against color plane",
    motifs: ["balance-line", "paired-block", "anchor-axis"],
    requiredFacts: [],
    variantSeed: 15,
  }),
  blueprint({
    recipeId: "human-pace",
    name: "Human Pace",
    thesis:
      "Documentary movement and factual captions create a human, unhurried path to contact.",
    themeFamily: "editorial",
    typographyStrategy: "humanist-sans",
    imageStrategy: "documentary",
    palette: {
      primary: "#273B4F",
      secondary: "#1C2B39",
      accent: "#B55A4F",
      background: "#F7F3ED",
      surface: "#FFFFFF",
    },
    homeFlow: ["features", "process", "contact", "services", "cta"],
    navigationComposition: "editorial caption rail header",
    heroComposition: "documentary image led opening with factual caption",
    openingComposition: "pace marks and a narrow caption rail",
    cardSystem: "caption-led story panels without quotations",
    processVisualization: "paced intervals with short factual steps",
    surfaceRhythm: "documentary image pauses between compact text groups",
    conversionPattern: "human context, process, access, then services",
    imageTreatment: "natural people-in-motion documentary crops",
    motifs: ["pace-mark", "caption-rail", "documentary-pause"],
    requiredFacts: [],
    variantSeed: 16,
  }),
  blueprint({
    recipeId: "assessment-rings",
    name: "Assessment Rings",
    thesis:
      "Concentric assessment arcs frame questions and next steps without presenting scores or progress.",
    themeFamily: "playful",
    typographyStrategy: "friendly-rounded",
    imageStrategy: "product-detail",
    palette: {
      primary: "#27766D",
      secondary: "#1B514B",
      accent: "#D36B58",
      background: "#F3F8F6",
      surface: "#FFFFFF",
    },
    homeFlow: ["process", "contact", "services", "features", "cta"],
    navigationComposition: "rounded rail with one ring marker",
    heroComposition: "compact split framed by concentric arcs",
    openingComposition: "assessment rings around the image, never percentages",
    cardSystem: "circular index cards with straight copy fields",
    processVisualization: "three open rings connected by a quiet path",
    surfaceRhythm: "compact circular moments inside clear rectangular fields",
    conversionPattern: "assessment expectations and contact before services",
    imageTreatment: "close range and equipment detail crops",
    motifs: ["assessment-ring", "open-circle", "ring-index"],
    requiredFacts: [],
    variantSeed: 17,
  }),
  blueprint({
    recipeId: "motion-tiles",
    name: "Motion Tiles",
    thesis:
      "A single movement image is segmented through layout, never duplicated, to create a modular active opening.",
    themeFamily: "playful",
    typographyStrategy: "geometric-modern",
    imageStrategy: "editorial-crop",
    palette: {
      primary: "#335C97",
      secondary: "#253F68",
      accent: "#E2A177",
      background: "#F4F6F1",
      surface: "#FFFFFF",
    },
    homeFlow: ["services", "features", "cta", "process", "contact"],
    navigationComposition: "modular tile rail",
    heroComposition: "one image segmented by a stepped CSS tile mask",
    openingComposition: "copy occupies the missing tile in the grid",
    cardSystem: "stepped content tiles with sage secondary accents",
    processVisualization: "three tiles rejoin as a linear path",
    surfaceRhythm: "modular tile clusters alternating with open bands",
    conversionPattern: "service and reassurance before early CTA",
    imageTreatment: "one clean movement crop viewed through a tile mask",
    motifs: ["stepped-tile", "missing-tile", "grid-rejoin"],
    requiredFacts: [],
    variantSeed: 18,
    mobileReflow:
      "At 390px and below remove the tile mask and render one clean 16:10 crop after the copy; retain 44px actions and sentence-case 600–700 display type.",
  }),
  blueprint({
    recipeId: "grounded-strength",
    name: "Grounded Strength",
    thesis:
      "Structural baselines and grounded imagery convey dependable functional support without outcome promises.",
    themeFamily: "corporate",
    typographyStrategy: "technical",
    imageStrategy: "people-led",
    palette: {
      primary: "#303A3C",
      secondary: "#222A2B",
      accent: "#B36B43",
      background: "#F4F1EB",
      surface: "#FFFFFF",
    },
    homeFlow: ["contact", "process", "services", "features", "cta"],
    navigationComposition: "structural beam header",
    heroComposition: "image anchored to a low horizontal band",
    openingComposition: "baseline bars and visible structural joints",
    cardSystem: "grounded cards aligned to a heavy baseline",
    processVisualization: "jointed path with rectangular nodes",
    surfaceRhythm: "low horizontal bands supporting open upper fields",
    conversionPattern: "access and process before detailed service proof",
    imageTreatment: "functional strength imagery with grounded crops",
    motifs: ["baseline-bar", "structural-joint", "grounded-band"],
    requiredFacts: [],
    variantSeed: 19,
  }),
  blueprint({
    recipeId: "open-practice",
    name: "Open Practice",
    thesis:
      "Open frames and a transparent information rail put practical clinic facts before persuasion.",
    themeFamily: "minimalist",
    typographyStrategy: "corporate-sans",
    imageStrategy: "restrained",
    palette: {
      primary: "#1F7183",
      secondary: "#164D59",
      accent: "#E0B44C",
      background: "#FAFCFC",
      surface: "#FFFFFF",
    },
    homeFlow: ["contact", "features", "services", "process", "cta"],
    navigationComposition: "open frame header with factual info rail",
    heroComposition: "minimal type beside a framed image window",
    openingComposition: "transparent disclosure rail crossing the frame",
    cardSystem: "open outline cards with visible labels",
    processVisualization: "plain disclosure steps with no decorative score",
    surfaceRhythm: "open white fields and selectively framed groups",
    conversionPattern: "practical facts, guidance, services, process, request",
    imageTreatment: "clinic and access imagery inside open frames",
    motifs: ["disclosure-rail", "open-frame", "image-window"],
    requiredFacts: [],
    variantSeed: 20,
  }),
] as const satisfies readonly PhysiotherapyCandidateBlueprint[];

export function physiotherapyCandidateBlueprintIssues(
  values: readonly PhysiotherapyCandidateBlueprint[] = PHYSIOTHERAPY_CANDIDATE_BLUEPRINTS,
): string[] {
  const issues: string[] = [];
  if (values.length !== 20)
    issues.push(`Expected 20 blueprints, received ${values.length}.`);
  if (new Set(values.map((value) => value.id)).size !== values.length)
    issues.push("Blueprint candidate IDs must be unique.");
  if (new Set(values.map((value) => value.recipeId)).size !== values.length)
    issues.push("Blueprint recipe IDs must be unique.");
  if (
    new Set(values.map((value) => value.homeFlow.join(">"))).size !==
    values.length
  )
    issues.push("Every blueprint needs a unique visible Home journey.");
  if (
    new Set(
      values.map((value) =>
        [value.heroComposition, value.cardSystem, value.imageTreatment].join(
          "::",
        ),
      ),
    ).size !== values.length
  )
    issues.push("Hero, card and image-treatment tuples must be unique.");
  for (const value of values) {
    if (!value.id.endsWith(value.recipeId))
      issues.push(`${value.id} does not match recipe ${value.recipeId}.`);
    if (new Set(value.homeFlow).size !== 5)
      issues.push(`${value.id} must order all five visible Home families.`);
    for (const family of [
      "services",
      "features",
      "process",
      "contact",
      "cta",
    ] as const)
      if (!value.homeFlow.includes(family))
        issues.push(`${value.id} is missing ${family} from its Home journey.`);
    if (value.motifs.length < 3)
      issues.push(`${value.id} needs at least three signature motifs.`);
  }
  return [...new Set(issues)];
}
