import type {
  RestaurantDraftBrief,
  RestaurantDraftRankingProfile,
} from "../../../builder/app/industry-packs/drafts";

export type RestaurantPreviewBriefId =
  "reference" | "menu" | "arrival" | "hosted";

export type RestaurantPreviewBrief = {
  id: RestaurantPreviewBriefId;
  content: RestaurantDraftBrief;
  rankingProfile?: RestaurantDraftRankingProfile;
};

export const RESTAURANT_MATRIX_BRIEFS = [
  {
    id: "menu",
    content: {
      businessName: "Sunroom Tiffin Counter",
      cuisines: ["South Indian", "Vegetarian"],
      serviceModes: ["Breakfast", "Lunch", "Counter service", "Takeaway"],
      menu: {
        suppliedAsCurrent: true,
        categories: [
          {
            name: "Morning plates",
            items: [
              {
                name: "Podi idli",
                description: "Steamed idli, podi and sesame oil.",
                price: "180",
                currency: "INR",
                disclosures: ["Contains sesame"],
              },
              {
                name: "Ragi dosa",
                description: "Ragi dosa with tomato chutney.",
                price: "220",
                currency: "INR",
              },
            ],
          },
          {
            name: "Lunch bowls",
            description: "Compact rice bowls served through lunch.",
            items: [
              {
                name: "Tamarind rice bowl",
                description: "Tamarind rice, roasted peanuts and cucumber.",
                price: "260",
                currency: "INR",
                disclosures: ["Contains peanuts"],
              },
              {
                name: "Coconut kurma bowl",
                description: "Rice, vegetable kurma and coconut.",
                price: "290",
                currency: "INR",
              },
            ],
          },
          {
            name: "Drinks",
            items: [
              {
                name: "Filter coffee",
                description: "Coffee with hot milk.",
                price: "90",
                currency: "INR",
                disclosures: ["Contains dairy"],
              },
              {
                name: "Nannari lime cooler",
                description: "Nannari syrup, lime and soda.",
                price: "120",
                currency: "INR",
              },
            ],
          },
        ],
        notes: [
          "Breakfast and lunch are served from the current counter menu.",
        ],
        disclosureNotes: [
          "Ask at the counter about ingredient and allergy information before ordering.",
        ],
      },
      goals: [
        "Make the current counter menu and prices easy to scan",
        "Keep unsupported location and contact details hidden",
      ],
      languages: ["en"],
    },
    rankingProfile: {
      domain: "restaurant",
      industry: "Restaurant",
      goals: ["Make the current counter menu and prices easy to scan"],
      styleTags: ["compact", "product-detail", "menu-led"],
      cuisines: ["South Indian", "Vegetarian"],
      serviceModes: ["Breakfast", "Lunch", "Counter service", "Takeaway"],
    },
  },
  {
    id: "arrival",
    content: {
      businessName: "Monsoon Verandah",
      cuisines: ["Coastal Indian"],
      serviceModes: ["Lunch", "Dinner", "Dine-in"],
      address: "Koregaon Park, Pune, Maharashtra",
      mapUrl:
        "https://www.google.com/maps/search/?api=1&query=Koregaon+Park+Pune",
      directions: ["The entrance is beside the east garden gate on Lane 6."],
      openingHours: [
        "Tuesday–Friday, 5:30 PM–11:00 PM",
        "Saturday–Sunday, 12:30 PM–11:00 PM",
      ],
      accessibility: [
        "A step-free route reaches the indoor dining room",
        "Contact the restaurant before visiting for verandah access details",
      ],
      parking: [
        "Paid parking is available in the neighbouring public car park",
      ],
      transit: ["The nearest bus stop is on North Main Road"],
      visitDetails: [
        "Indoor and verandah tables are used according to availability and weather.",
      ],
      phone: "+91 20 4100 7788",
      email: "visit@monsoonverandah.example",
      goals: [
        "Make location, opening hours and arrival details easy to find",
        "Keep unsupported menu and restaurant-story content hidden",
      ],
      languages: ["en"],
    },
    rankingProfile: {
      domain: "restaurant",
      industry: "Restaurant",
      goals: ["Make location, opening hours and arrival details easy to find"],
      styleTags: ["documentary", "natural", "airy", "place-led"],
      location: "Koregaon Park, Pune, Maharashtra",
      openingHours: [
        "Tuesday–Friday, 5:30 PM–11:00 PM",
        "Saturday–Sunday, 12:30 PM–11:00 PM",
      ],
      cuisines: ["Coastal Indian"],
      serviceModes: ["Lunch", "Dinner", "Dine-in"],
      address: "Koregaon Park, Pune, Maharashtra",
      mapUrl:
        "https://www.google.com/maps/search/?api=1&query=Koregaon+Park+Pune",
    },
  },
  {
    id: "hosted",
    content: {
      businessName: "Cedar Room Suppers",
      cuisines: ["Levantine", "Mediterranean"],
      serviceModes: ["Dinner", "Private dining", "Group dining"],
      menu: {
        suppliedAsCurrent: true,
        categories: [
          {
            name: "Shared starters",
            items: [
              {
                name: "Charred aubergine dip",
                description: "Aubergine, tahini and pomegranate.",
                price: "420",
                currency: "INR",
                disclosures: ["Contains sesame"],
              },
              {
                name: "Herb falafel",
                description: "Chickpea, herbs and pickled turnip.",
                price: "390",
                currency: "INR",
              },
            ],
          },
          {
            name: "Supper plates",
            items: [
              {
                name: "Sumac cauliflower",
                description: "Roasted cauliflower, sumac and herb sauce.",
                price: "520",
                currency: "INR",
              },
              {
                name: "Baharat chicken",
                description: "Grilled chicken, baharat and lemon.",
                price: "690",
                currency: "INR",
              },
            ],
          },
          {
            name: "Sweet plates",
            items: [
              {
                name: "Orange blossom custard",
                description: "Milk custard, orange blossom and pistachio.",
                price: "340",
                currency: "INR",
                disclosures: ["Contains dairy and nuts"],
              },
            ],
          },
        ],
        notes: ["The current supper menu is designed as shared plates."],
        disclosureNotes: [
          "Tell the host about allergies when requesting a table and again before ordering.",
        ],
      },
      address: "Alwarpet, Chennai, Tamil Nadu",
      email: "host@cedarroomsuppers.example",
      reservationPolicy: [
        "A request is reviewed against the hosted-supper schedule.",
        "The host confirms accepted requests separately by email.",
      ],
      partyDetails: [
        "Include the group size, occasion and preferred date in the request.",
      ],
      specialRequestNotes: [
        "Add seating, dietary and access requests so the host can respond accurately.",
      ],
      story: {
        heading: "Hosted suppers planned around the table",
        paragraphs: [
          "Cedar Room Suppers serves a compact shared menu for hosted group dinners in Alwarpet.",
          "Each request is reviewed before the host confirms a date and table.",
        ],
        principles: [
          "Keep group planning explicit",
          "Show the supplied menu and prices",
          "Separate a request from confirmation",
        ],
        people: [
          {
            name: "Mira Sethi",
            role: "Supper host",
            biography:
              "Mira coordinates group requests, dietary notes and hosted-supper dates.",
            verified: true,
          },
        ],
      },
      goals: [
        "Explain hosted group dining and the current shared menu",
        "Collect accurate party details without promising availability",
      ],
      languages: ["en"],
    },
    rankingProfile: {
      domain: "restaurant",
      industry: "Restaurant",
      goals: ["Explain hosted group dining and the current shared menu"],
      styleTags: ["structured", "planning", "product-detail", "hosted"],
      requiredCapabilities: ["reservation request", "private dining"],
      cuisines: ["Levantine", "Mediterranean"],
      serviceModes: ["Dinner", "Private dining", "Group dining"],
      address: "Alwarpet, Chennai, Tamil Nadu",
      reservationPolicy: [
        "A request is reviewed against the hosted-supper schedule.",
      ],
      partyDetails: ["Include the group size, occasion and preferred date."],
      specialRequestNotes: ["Add seating, dietary and access requests."],
      story: {
        heading: "Hosted suppers planned around the table",
        paragraphs: ["Hosted group dinners in Alwarpet."],
        people: [{ name: "Mira Sethi", role: "Supper host", verified: true }],
      },
    },
  },
] as const satisfies readonly RestaurantPreviewBrief[];
