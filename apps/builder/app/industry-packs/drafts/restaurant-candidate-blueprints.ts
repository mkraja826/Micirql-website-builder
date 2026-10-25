import type {
  ImageStrategy,
  ThemeFamily,
  TypographyStrategy,
} from "@micirql/schema";
import type { SectionFamily } from "@micirql/sections";

export const RESTAURANT_CANDIDATE_BLUEPRINT_VERSION =
  "restaurant-blueprints-2026.10.24" as const;

type HomeFlowFamily = Extract<
  SectionFamily,
  "gallery" | "services" | "about" | "features" | "contact" | "cta"
>;

export type RestaurantCandidateRequiredFact =
  "location" | "opening-hours" | "menu" | "reservation-policy" | "story";

export type RestaurantCandidateBlueprint = {
  id: `restaurant-restaurant-${string}`;
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
    textMuted: `#${string}`;
    border: `#${string}`;
  };
  homeFlow: readonly HomeFlowFamily[];
  navigationComposition: string;
  heroComposition: string;
  openingComposition: string;
  menuComposition: string;
  venueProofModel: string;
  reservationPresentation: string;
  surfaceRhythm: string;
  imageTreatment: string;
  mobileReflow: string;
  motifs: readonly string[];
  requiredFacts: readonly RestaurantCandidateRequiredFact[];
  variantSeed: number;
};

const stableMobileRule =
  "Collapse to one semantic copy-first single column by 390px; remove overlap, side labels and decorative offsets from the reading path; keep each menu price associated with its item and every action at least 44px.";

function blueprint(
  value: Omit<RestaurantCandidateBlueprint, "id" | "mobileReflow"> & {
    mobileReflow?: string;
  },
): RestaurantCandidateBlueprint {
  return {
    ...value,
    id: `restaurant-restaurant-${value.recipeId}`,
    mobileReflow: value.mobileReflow ?? stableMobileRule,
  };
}

export const RESTAURANT_CANDIDATE_BLUEPRINTS = [
  blueprint({
    recipeId: "table-story-editorial",
    name: "Table Story Editorial",
    thesis:
      "A warm table-led editorial journey balances menu reading, place imagery and a truthful reservation request.",
    themeFamily: "editorial",
    typographyStrategy: "editorial-serif",
    imageStrategy: "editorial-crop",
    palette: {
      primary: "#7A2E1F",
      secondary: "#25180F",
      accent: "#D39A37",
      background: "#FFF9F1",
      surface: "#FFFFFF",
      textMuted: "#6B5A4B",
      border: "#D9C8B6",
    },
    homeFlow: ["gallery", "services", "about", "features", "contact", "cta"],
    navigationComposition:
      "double-rule masthead with a restrained table request",
    heroComposition:
      "copy beside a tall venue frame with an offset table-edge rule",
    openingComposition: "dish-and-room contact sheet before the menu preview",
    menuComposition: "serif category folios with paired item and price columns",
    venueProofModel:
      "editorial room sequence followed by supplied arrival facts",
    reservationPresentation:
      "quiet request panel with receipt-not-confirmation note",
    surfaceRhythm:
      "warm paper bands, double rules and generous editorial margins",
    imageTreatment: "one wide room image followed by paired food crops",
    motifs: ["table-edge-frame", "double-rule", "menu-folio"],
    requiredFacts: ["menu", "location", "opening-hours"],
    variantSeed: 1,
  }),
  blueprint({
    recipeId: "market-ledger",
    name: "Market Ledger",
    thesis:
      "A compact daily ledger makes a supplied menu and practical visit facts fast to compare without implying live availability.",
    themeFamily: "corporate",
    typographyStrategy: "technical",
    imageStrategy: "product-detail",
    palette: {
      primary: "#1F5A45",
      secondary: "#142D25",
      accent: "#C9822D",
      background: "#F5F3E9",
      surface: "#FFFEF8",
      textMuted: "#53655C",
      border: "#BFC8BF",
    },
    homeFlow: ["services", "features", "gallery", "contact", "about", "cta"],
    navigationComposition: "compact market header with ledger index marks",
    heroComposition: "menu-led 7/5 grid with a narrow ingredient-detail rail",
    openingComposition: "current-menu ledger immediately below the proposition",
    menuComposition: "ruled rows, fixed price cells and category index codes",
    venueProofModel:
      "small documentary strip paired with address and hours ledger",
    reservationPresentation: "utility request block after practical facts",
    surfaceRhythm: "dense ruled tables and numbered margin annotations",
    imageTreatment: "tight ingredient and preparation details in narrow crops",
    motifs: ["ledger-rule", "index-code", "price-cell"],
    requiredFacts: ["menu", "opening-hours"],
    variantSeed: 2,
  }),
  blueprint({
    recipeId: "courtyard-threshold",
    name: "Courtyard Threshold",
    thesis:
      "Arrival and place lead a calm hospitality journey before the menu and table request.",
    themeFamily: "organic",
    typographyStrategy: "humanist-sans",
    imageStrategy: "documentary",
    palette: {
      primary: "#48623A",
      secondary: "#243126",
      accent: "#C56D3E",
      background: "#F6F1E5",
      surface: "#FFFDF7",
      textMuted: "#62705F",
      border: "#C8CDBE",
    },
    homeFlow: ["gallery", "features", "about", "services", "cta", "contact"],
    navigationComposition:
      "open garden rail with location cue and final request action",
    heroComposition:
      "two-thirds courtyard photograph beside a narrow botanical margin",
    openingComposition:
      "independent exterior, courtyard and table frames establish place",
    menuComposition:
      "generous category fields separated by restrained leaf markers",
    venueProofModel:
      "exterior, entrance and room evidence before supplied visit facts",
    reservationPresentation:
      "bordered request panel placed after the factual arrival block",
    surfaceRhythm:
      "soft rectangular garden fields and staggered breathing room",
    imageTreatment:
      "natural-light exterior and room crops in independent rectangular frames",
    motifs: ["botanical-margin", "leaf-divider", "courtyard-field"],
    requiredFacts: ["location", "opening-hours"],
    variantSeed: 3,
  }),
  blueprint({
    recipeId: "tasting-sequence",
    name: "Tasting Sequence",
    thesis:
      "A restrained programme turns the supplied menu, story and reservation policy into a deliberate dining sequence with no procedural metaphor.",
    themeFamily: "minimalist",
    typographyStrategy: "geometric-modern",
    imageStrategy: "restrained",
    palette: {
      primary: "#33403D",
      secondary: "#171D1C",
      accent: "#A76532",
      background: "#F8F7F2",
      surface: "#FFFFFF",
      textMuted: "#5F6966",
      border: "#CDD1CE",
    },
    homeFlow: ["services", "about", "gallery", "features", "contact", "cta"],
    navigationComposition:
      "quiet programme rail with one compact request action",
    heroComposition: "framed dining image between two narrow programme margins",
    openingComposition: "menu first, followed by supplied approach and imagery",
    menuComposition: "unnumbered programme chapters with narrow item measures",
    venueProofModel: "one room frame and a concise supplied-facts chapter",
    reservationPresentation:
      "concluding programme panel labelled as a request, not a booking",
    surfaceRhythm: "white space, hairline dividers and slim chapter titles",
    imageTreatment: "few deliberate landscape crops with plain captions",
    motifs: ["programme-margin", "chapter-title", "hairline-divider"],
    requiredFacts: ["menu", "story", "reservation-policy"],
    variantSeed: 4,
  }),
  blueprint({
    recipeId: "neighbourhood-window",
    name: "Neighbourhood Window",
    thesis:
      "A local street-facing composition puts location, hours and a readable menu ahead of decorative brand claims.",
    themeFamily: "editorial",
    typographyStrategy: "humanist-sans",
    imageStrategy: "documentary",
    palette: {
      primary: "#8A3D2E",
      secondary: "#28352F",
      accent: "#D4A84F",
      background: "#FAF4E8",
      surface: "#FFFCF6",
      textMuted: "#6F6256",
      border: "#D8C9B6",
    },
    homeFlow: ["features", "gallery", "services", "about", "cta", "contact"],
    navigationComposition:
      "street-sign header with location before the request action",
    heroComposition:
      "shop-window panorama with a grounded local-information card",
    openingComposition:
      "location and hours followed by venue and menu evidence",
    menuComposition:
      "neighbourhood chalkboard rhythm without simulated handwriting",
    venueProofModel:
      "exterior, approach and supplied transit facts as the main proof",
    reservationPresentation:
      "friendly table request after the menu and local context",
    surfaceRhythm: "window frames, address bands and modest sign-like dividers",
    imageTreatment: "wide exterior and eye-level room documentary crops",
    motifs: ["shop-window", "address-band", "street-sign"],
    requiredFacts: ["location", "opening-hours", "menu"],
    variantSeed: 5,
  }),
  blueprint({
    recipeId: "open-fire",
    name: "Open Fire",
    thesis:
      "A bold ember-and-charcoal direction leads with preparation energy while keeping every dish and process claim evidence-bound.",
    themeFamily: "maximalist",
    typographyStrategy: "geometric-modern",
    imageStrategy: "immersive",
    palette: {
      primary: "#D8562B",
      secondary: "#1D1B19",
      accent: "#F2B544",
      background: "#171513",
      surface: "#2B2723",
      textMuted: "#D1C5B7",
      border: "#5B4A3D",
    },
    homeFlow: ["gallery", "about", "services", "contact", "features", "cta"],
    navigationComposition: "dark horizontal bar cut by a single ember action",
    heroComposition:
      "immersive preparation crop with a protected charcoal copy plate",
    openingComposition:
      "image-first preparation band followed by supplied approach",
    menuComposition: "high-contrast item strips separated by ember rules",
    venueProofModel:
      "process imagery clearly labelled illustrative, then supplied room facts",
    reservationPresentation:
      "solid ember request slab with explicit confirmation caveat",
    surfaceRhythm:
      "charcoal blocks, offset ember rules and hard horizontal cuts",
    imageTreatment: "immersive close crops with dark protected text zones",
    motifs: ["ember-rule", "charcoal-plate", "fireline-strip"],
    requiredFacts: ["menu", "story", "reservation-policy"],
    variantSeed: 6,
  }),
  blueprint({
    recipeId: "seasonal-journal",
    name: "Seasonal Journal",
    thesis:
      "An undated seasonal register presents only the current supplied menu while giving its story and ingredients room to breathe.",
    themeFamily: "editorial",
    typographyStrategy: "editorial-serif",
    imageStrategy: "editorial-crop",
    palette: {
      primary: "#50623B",
      secondary: "#2A3025",
      accent: "#B46D4B",
      background: "#F3EEDF",
      surface: "#FFFCF5",
      textMuted: "#6C6B5B",
      border: "#CBC3AE",
    },
    homeFlow: ["about", "gallery", "services", "features", "contact", "cta"],
    navigationComposition: "seasonal masthead with compact edition navigation",
    heroComposition:
      "vertical food frame beside an uninterrupted seasonal note",
    openingComposition: "supplied story note before illustrative food and menu",
    menuComposition:
      "seasonal category spreads with a consistent outer price edge",
    venueProofModel: "captioned place imagery followed by factual visit notes",
    reservationPresentation:
      "folded-paper request insert with no urgency or availability claim",
    surfaceRhythm:
      "broad paper folds, edition marks and quiet margins without notebook rules",
    imageTreatment:
      "warm editorial crops with captions directly beneath each frame",
    motifs: ["paper-fold", "edition-mark", "seasonal-spread"],
    requiredFacts: ["story", "menu"],
    variantSeed: 7,
  }),
  blueprint({
    recipeId: "family-table",
    name: "Family Table",
    thesis:
      "A generous friendly layout helps groups understand the menu, practical details and table-request process without fabricated social proof.",
    themeFamily: "playful",
    typographyStrategy: "friendly-rounded",
    imageStrategy: "documentary",
    palette: {
      primary: "#B64032",
      secondary: "#324838",
      accent: "#E2A93B",
      background: "#FFF6E8",
      surface: "#FFFFFF",
      textMuted: "#6D6256",
      border: "#E0CFB8",
    },
    homeFlow: ["services", "gallery", "features", "contact", "about", "cta"],
    navigationComposition: "friendly tab row with a clear group-request action",
    heroComposition: "broad shared-table frame beside compact welcoming copy",
    openingComposition:
      "menu preview before room imagery and practical group facts",
    menuComposition:
      "generous category blocks with highly visible price anchors",
    venueProofModel:
      "room imagery and supplied seating/access facts, never invented crowds",
    reservationPresentation:
      "large labelled party-size request panel with calm expectations",
    surfaceRhythm:
      "rounded tabs, warm blocks and alternating generous groupings",
    imageTreatment:
      "wide table and food crops without implying real guests or portions",
    motifs: ["shared-table", "category-tab", "party-size-panel"],
    requiredFacts: ["menu", "reservation-policy"],
    variantSeed: 8,
  }),
  blueprint({
    recipeId: "ingredient-atlas",
    name: "Ingredient Atlas",
    thesis:
      "A botanical atlas language organizes the menu and supplied approach without inferring ingredients or dietary status.",
    themeFamily: "organic",
    typographyStrategy: "editorial-serif",
    imageStrategy: "product-detail",
    palette: {
      primary: "#315D46",
      secondary: "#243329",
      accent: "#C58E3F",
      background: "#F4F5E9",
      surface: "#FEFFF9",
      textMuted: "#627064",
      border: "#C7D0BE",
    },
    homeFlow: ["gallery", "services", "features", "about", "contact", "cta"],
    navigationComposition: "specimen-index header with small category markers",
    heroComposition: "ingredient-detail mosaic beside an atlas title block",
    openingComposition:
      "illustrative ingredient plate followed by supplied menu categories",
    menuComposition:
      "indexed specimens with descriptions and prices on a baseline grid",
    venueProofModel:
      "separate factual place panel so ingredients never imply sourcing",
    reservationPresentation:
      "simple request card after the atlas and place facts",
    surfaceRhythm:
      "botanical grids, small index circles and pale specimen fields",
    imageTreatment: "macro ingredient crops explicitly marked as illustrative",
    motifs: ["specimen-grid", "atlas-index", "botanical-marker"],
    requiredFacts: ["menu", "story"],
    variantSeed: 9,
  }),
  blueprint({
    recipeId: "counter-rhythm",
    name: "Counter Signal",
    thesis:
      "A compact urban signboard gives a contemporary counter-service menu strong cadence while keeping practical actions immediately visible.",
    themeFamily: "playful",
    typographyStrategy: "technical",
    imageStrategy: "editorial-crop",
    palette: {
      primary: "#1B726B",
      secondary: "#122B2B",
      accent: "#E1A64A",
      background: "#EDF4F1",
      surface: "#FFFFFF",
      textMuted: "#536A67",
      border: "#B9CBC7",
    },
    homeFlow: ["services", "gallery", "about", "contact", "features", "cta"],
    navigationComposition:
      "compact urban sign strip with aligned utility labels",
    heroComposition:
      "two-line typographic marquee above one shallow counter photograph",
    openingComposition:
      "fully visible request band before concise menu rows and venue evidence",
    menuComposition: "board-like linear rows with a fixed outer price edge",
    venueProofModel:
      "independent storefront, counter and room frames with factual captions",
    reservationPresentation:
      "full-width request band immediately after the opening image",
    surfaceRhythm: "sign bands, shallow image fields and measured linear gaps",
    imageTreatment:
      "documentary street and counter crops without tiled segmentation",
    motifs: ["counter-marquee", "fixed-price-edge", "urban-sign-band"],
    requiredFacts: ["menu"],
    variantSeed: 10,
  }),
  blueprint({
    recipeId: "night-passage",
    name: "Night Passage",
    thesis:
      "A cinematic evening arrival moves from atmosphere to menu and practical details without claiming a specific ambience or crowd.",
    themeFamily: "cinematic",
    typographyStrategy: "luxury-serif",
    imageStrategy: "immersive",
    palette: {
      primary: "#B9824C",
      secondary: "#10171A",
      accent: "#D9B56D",
      background: "#0B1113",
      surface: "#172025",
      textMuted: "#BAC4C6",
      border: "#38464A",
    },
    homeFlow: ["gallery", "about", "features", "services", "contact", "cta"],
    navigationComposition: "transparent night rail over a protected dark field",
    heroComposition:
      "full-bleed evening room image with a narrow luminous copy lane",
    openingComposition: "cinematic venue sequence before story, facts and menu",
    menuComposition: "dark menu panels with restrained luminous category rules",
    venueProofModel:
      "illustrative atmosphere labelled clearly, followed by supplied arrival data",
    reservationPresentation:
      "luminous request band with explicit response expectation",
    surfaceRhythm:
      "dark passages, narrow light rails and immersive image intervals",
    imageTreatment:
      "full-width low-light room crops with protected contrast overlays",
    motifs: ["light-rail", "night-passage", "luminous-rule"],
    requiredFacts: ["location", "opening-hours", "reservation-policy"],
    variantSeed: 11,
  }),
  blueprint({
    recipeId: "linen-and-light",
    name: "Linen and Light",
    thesis:
      "A quiet premium direction uses measured whitespace, tactile surfaces and a concise menu without oversized luxury typography.",
    themeFamily: "luxury",
    typographyStrategy: "luxury-serif",
    imageStrategy: "restrained",
    palette: {
      primary: "#665242",
      secondary: "#2A2622",
      accent: "#B89A63",
      background: "#F7F3EC",
      surface: "#FFFFFF",
      textMuted: "#716961",
      border: "#D7CEC2",
    },
    homeFlow: ["about", "services", "gallery", "features", "cta", "contact"],
    navigationComposition:
      "centered quiet wordmark rail with a narrow request control",
    heroComposition:
      "small refined copy beside a tall naturally lit table crop",
    openingComposition:
      "supplied approach before a concise menu and image suite",
    menuComposition: "single-column fine rules with spacious item descriptions",
    venueProofModel:
      "one restrained room frame and a plain practical-information band",
    reservationPresentation:
      "quiet outlined request panel with no exclusivity claims",
    surfaceRhythm: "linen fields, thin warm rules and controlled white space",
    imageTreatment: "few pale naturally lit crops with large calm margins",
    motifs: ["linen-field", "fine-rule", "light-frame"],
    requiredFacts: ["story", "menu", "reservation-policy"],
    variantSeed: 12,
  }),
  blueprint({
    recipeId: "brass-and-spice",
    name: "Brass and Spice",
    thesis:
      "A rich material collage creates celebration through color and pattern while every menu and venue statement remains supplied.",
    themeFamily: "maximalist",
    typographyStrategy: "editorial-serif",
    imageStrategy: "immersive",
    palette: {
      primary: "#8C2F23",
      secondary: "#2B1715",
      accent: "#D9A21B",
      background: "#F7E8D1",
      surface: "#FFF8EA",
      textMuted: "#74594B",
      border: "#D8B779",
    },
    homeFlow: ["gallery", "services", "about", "contact", "cta", "features"],
    navigationComposition:
      "ornamental color bar constrained by a strict content grid",
    heroComposition:
      "asymmetric food collage with a protected solid title panel",
    openingComposition:
      "rich illustrative food field followed immediately by menu facts",
    menuComposition:
      "color-block categories with clean white item reading areas",
    venueProofModel:
      "separate neutral visit band that prevents pattern from obscuring facts",
    reservationPresentation:
      "bold brass-edged request block with plain confirmation copy",
    surfaceRhythm:
      "saturated material blocks, inset neutral reading fields and brass rules",
    imageTreatment:
      "vivid food and material crops without color retouching or dish claims",
    motifs: ["brass-rule", "spice-block", "protected-reading-field"],
    requiredFacts: ["menu", "reservation-policy"],
    variantSeed: 13,
  }),
  blueprint({
    recipeId: "menu-poster",
    name: "Menu Poster",
    thesis:
      "A graphic poster system makes the supplied menu unmistakable while keeping type readable and mixed case on small screens.",
    themeFamily: "playful",
    typographyStrategy: "geometric-modern",
    imageStrategy: "editorial-crop",
    palette: {
      primary: "#C4472D",
      secondary: "#23333A",
      accent: "#F0B83F",
      background: "#FFF4D8",
      surface: "#FFFFFF",
      textMuted: "#667077",
      border: "#DBC99D",
    },
    homeFlow: ["services", "gallery", "contact", "features", "about", "cta"],
    navigationComposition: "compact poster strip with boxed route labels",
    heroComposition: "stacked typographic poster beside a square image tile",
    openingComposition:
      "menu poster before gallery, request preview and visit facts",
    menuComposition:
      "large mixed-case category banners with compact item lists",
    venueProofModel:
      "plain factual footer to the poster field with no decorative data",
    reservationPresentation: "boxed request ticket with clear status language",
    surfaceRhythm:
      "poster blocks, offset color tabs and disciplined text boxes",
    imageTreatment:
      "square art-directed crops framed as illustration, not merchant proof",
    motifs: ["poster-block", "route-tab", "request-ticket"],
    requiredFacts: ["menu", "reservation-policy"],
    variantSeed: 14,
  }),
  blueprint({
    recipeId: "reservation-concierge",
    name: "Reservation Concierge",
    thesis:
      "A service-first direction explains the request process early, then supports the decision with menu, place and policy facts.",
    themeFamily: "corporate",
    typographyStrategy: "humanist-sans",
    imageStrategy: "restrained",
    palette: {
      primary: "#315C68",
      secondary: "#1E3035",
      accent: "#B87945",
      background: "#F2F6F5",
      surface: "#FFFFFF",
      textMuted: "#5D6C70",
      border: "#C5D1D2",
    },
    homeFlow: ["contact", "services", "features", "gallery", "about", "cta"],
    navigationComposition: "concierge utility bar with request status language",
    heroComposition:
      "request explainer beside a restrained room image and policy rail",
    openingComposition:
      "reservation preview first, then menu and practical confidence",
    menuComposition:
      "compact comparison rows optimized for pre-request scanning",
    venueProofModel:
      "supplied facts matrix followed by one restrained venue sequence",
    reservationPresentation:
      "prominent labelled request card with three response steps",
    surfaceRhythm:
      "calm utility panels, status rails and clearly separated evidence groups",
    imageTreatment:
      "restrained room and food crops secondary to request clarity",
    motifs: ["status-rail", "concierge-panel", "response-step"],
    requiredFacts: ["reservation-policy", "menu", "opening-hours"],
    variantSeed: 15,
  }),
  blueprint({
    recipeId: "terrace-air",
    name: "Terrace Air",
    thesis:
      "An airy open-frame composition leads with space and arrival while keeping any outdoor or seating claim strictly supplied.",
    themeFamily: "glass",
    typographyStrategy: "humanist-sans",
    imageStrategy: "documentary",
    palette: {
      primary: "#39706B",
      secondary: "#253E3C",
      accent: "#C98D4E",
      background: "#EEF6F2",
      surface: "#FFFFFF",
      textMuted: "#5B706D",
      border: "#BED0CB",
    },
    homeFlow: ["gallery", "features", "services", "contact", "about", "cta"],
    navigationComposition:
      "light floating rail anchored to a factual location chip",
    heroComposition:
      "panoramic open-space image under a translucent copy frame",
    openingComposition:
      "place and arrival first, followed by menu and request preview",
    menuComposition:
      "airy translucent category panes with opaque reading surfaces",
    venueProofModel: "large place image plus supplied access and seating facts",
    reservationPresentation:
      "opaque request card grounded beneath the open fields",
    surfaceRhythm: "transparent edges, wide gaps and overlapping light planes",
    imageTreatment:
      "bright wide-angle place crops with no fabricated outdoor claim",
    motifs: ["open-frame", "location-chip", "light-plane"],
    requiredFacts: ["location", "opening-hours"],
    variantSeed: 16,
  }),
  blueprint({
    recipeId: "banquet-plan",
    name: "Banquet Plan",
    thesis:
      "A structured group-dining plan keeps party guidance, menu options and contact expectations easy to scan without inventing capacity.",
    themeFamily: "corporate",
    typographyStrategy: "corporate-sans",
    imageStrategy: "product-detail",
    palette: {
      primary: "#6A3B56",
      secondary: "#2E2530",
      accent: "#B88A52",
      background: "#F5F1F4",
      surface: "#FFFFFF",
      textMuted: "#6E626C",
      border: "#D2C8D0",
    },
    homeFlow: ["features", "services", "contact", "gallery", "about", "cta"],
    navigationComposition:
      "structured planning header with grouped route labels",
    heroComposition: "fact grid beside a wide table-setting image",
    openingComposition: "practical group facts before menu and request preview",
    menuComposition:
      "structured category grid with clean price and disclosure columns",
    venueProofModel:
      "supplied access, seating and arrival facts in a planning matrix",
    reservationPresentation:
      "party-size request panel that avoids availability or capacity claims",
    surfaceRhythm: "measured grids, section headers and planning dividers",
    imageTreatment:
      "table-setting and room details isolated from capacity statements",
    motifs: ["planning-grid", "party-panel", "section-header"],
    requiredFacts: ["reservation-policy", "menu", "location"],
    variantSeed: 17,
  }),
  blueprint({
    recipeId: "kitchen-pass",
    name: "Kitchen Pass",
    thesis:
      "A documentary pass-through rhythm pairs illustrative process imagery with the supplied menu and story while never presenting stock people as staff.",
    themeFamily: "editorial",
    typographyStrategy: "technical",
    imageStrategy: "documentary",
    palette: {
      primary: "#A34A2F",
      secondary: "#282B28",
      accent: "#D6A552",
      background: "#F4F1E9",
      surface: "#FFFFFF",
      textMuted: "#666A64",
      border: "#CAC7BD",
    },
    homeFlow: ["about", "gallery", "services", "contact", "features", "cta"],
    navigationComposition: "pass-ticket header with compact factual labels",
    heroComposition:
      "documentary preparation strip above a clipped story ticket",
    openingComposition:
      "supplied approach followed by illustrative process and menu",
    menuComposition:
      "order-ticket groups with aligned items, prices and disclosures",
    venueProofModel:
      "separate room and visit block so process imagery cannot imply staff proof",
    reservationPresentation:
      "request docket with receipt-not-confirmation status",
    surfaceRhythm: "ticket edges, pass rails and documentary strips",
    imageTreatment:
      "wide process crops explicitly identified as illustrative stock",
    motifs: ["pass-ticket", "docket-edge", "documentary-strip"],
    requiredFacts: ["story", "menu", "reservation-policy"],
    variantSeed: 18,
  }),
  blueprint({
    recipeId: "dual-script",
    name: "Dual Script",
    thesis:
      "A language-structure-led direction gives supplied translations equal status while falling back cleanly to one language.",
    themeFamily: "editorial",
    typographyStrategy: "humanist-sans",
    imageStrategy: "documentary",
    palette: {
      primary: "#3B3B7A",
      secondary: "#1E2340",
      accent: "#D77B1E",
      background: "#FFF8E8",
      surface: "#FFFFFF",
      textMuted: "#62647A",
      border: "#D8CEBA",
    },
    homeFlow: ["services", "features", "gallery", "about", "contact", "cta"],
    navigationComposition:
      "equal-status language labels beside one restrained request action",
    heroComposition:
      "paired language columns bridged by one independent venue image",
    openingComposition:
      "paired menu names followed by one factual place sequence",
    menuComposition:
      "each item keeps supplied translations attached to one shared price",
    venueProofModel:
      "local exterior, room and dish frames captioned only in supplied languages",
    reservationPresentation:
      "one accessible language control above one ordinary request form",
    surfaceRhythm:
      "paired text measures, shared price rails and calm editorial bands",
    imageTreatment:
      "local documentary crops without cultural stereotypes or decorative masks",
    motifs: ["paired-language", "shared-price", "script-bridge"],
    requiredFacts: ["menu", "story"],
    variantSeed: 19,
  }),
  blueprint({
    recipeId: "quiet-room",
    name: "Quiet Room",
    thesis:
      "A restrained room-first direction reduces visual noise and lets verified menu, access and reservation information carry the experience.",
    themeFamily: "minimalist",
    typographyStrategy: "humanist-sans",
    imageStrategy: "restrained",
    palette: {
      primary: "#4E625F",
      secondary: "#242D2C",
      accent: "#A97D52",
      background: "#F4F4F0",
      surface: "#FFFFFF",
      textMuted: "#626C6A",
      border: "#CED3D0",
    },
    homeFlow: ["features", "gallery", "about", "services", "contact", "cta"],
    navigationComposition: "open-frame header with no decorative interruption",
    heroComposition: "small copy field beside a single calm room panorama",
    openingComposition: "practical visit facts before place, story and menu",
    menuComposition:
      "plain single-column lists with clear price anchors and no card chrome",
    venueProofModel: "one room image plus concise supplied arrival information",
    reservationPresentation:
      "minimal request panel with a visible response note",
    surfaceRhythm:
      "quiet white fields, sparse dividers and bounded reading measures",
    imageTreatment:
      "one calm room crop and a small number of restrained food details",
    motifs: ["quiet-frame", "sparse-divider", "bounded-measure"],
    requiredFacts: ["location", "opening-hours", "menu"],
    variantSeed: 20,
  }),
] as const satisfies readonly RestaurantCandidateBlueprint[];

export function restaurantCandidateBlueprintIssues(
  values: readonly RestaurantCandidateBlueprint[] = RESTAURANT_CANDIDATE_BLUEPRINTS,
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
        [
          value.heroComposition,
          value.menuComposition,
          value.venueProofModel,
          value.reservationPresentation,
          value.imageTreatment,
        ].join("::"),
      ),
    ).size !== values.length
  )
    issues.push(
      "Hero, menu, venue-proof, reservation and image-treatment tuples must be unique.",
    );

  const requiredHomeFamilies: readonly HomeFlowFamily[] = [
    "gallery",
    "services",
    "about",
    "features",
    "contact",
    "cta",
  ];
  for (const value of values) {
    if (!value.id.endsWith(value.recipeId))
      issues.push(`${value.id} does not match recipe ${value.recipeId}.`);
    if (new Set(value.homeFlow).size !== requiredHomeFamilies.length)
      issues.push(`${value.id} must order all six visible Home families.`);
    for (const family of requiredHomeFamilies)
      if (!value.homeFlow.includes(family))
        issues.push(`${value.id} is missing ${family} from its Home journey.`);
    if (value.motifs.length < 3)
      issues.push(`${value.id} needs at least three signature motifs.`);
    if (!value.mobileReflow.includes("single column"))
      issues.push(`${value.id} needs an explicit single-column mobile rule.`);
    if (value.typographyStrategy === "high-impact-display")
      issues.push(
        `${value.id} cannot use the prohibited high-impact display stack.`,
      );
    const authoredLanguage = [
      value.name,
      value.thesis,
      value.navigationComposition,
      value.heroComposition,
      value.openingComposition,
      value.menuComposition,
      value.venueProofModel,
      value.reservationPresentation,
      value.surfaceRhythm,
      value.imageTreatment,
      value.mobileReflow,
      ...value.motifs,
    ].join(" ");
    if (
      /dental|dentist|physio|patient|treatment|appointment/i.test(
        authoredLanguage,
      )
    )
      issues.push(`${value.id} contains cross-industry clinical language.`);
  }
  return [...new Set(issues)];
}
