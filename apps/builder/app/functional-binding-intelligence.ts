import { siteSchema, type Site } from "@micirql/schema";

export type FunctionalFacts = {
  notes?: string | null;
  goals?: string[];
  location?: string | null;
  workspaceId?: string;
  siteId?: string;
  industry?: string | null;
};

type Action = { label: string; href: string };

export function applyFunctionalBindings(site: Site, facts: FunctionalFacts): { site: Site; bound: string[] } {
  const next = structuredClone(site);
  const text = [facts.notes ?? "", facts.location ?? "", ...(facts.goals ?? [])].join("\n");
  const destinations = extractDestinations(text);
  const bound = new Set<string>();

  for (const page of next.pages) {
    for (const section of page.sections) {
      const props = section.props ?? {};
      const family = familyFromId(section.component.componentId);
      if (!family) continue;

      if (family === "hero" || family === "cta" || family === "contact") {
        const primary = preferredPrimary(destinations, facts.goals ?? []);
        const secondary = preferredSecondary(destinations, primary?.href);
        if (primary) { props.primaryAction = primary; bound.add(kind(primary.href)); }
        if (secondary) { props.secondaryAction = secondary; bound.add(kind(secondary.href)); }
      }

      if (family === "contact") {
        const externalForm = destinations.form;
        if (externalForm) {
          props.formAction = externalForm;
          bound.add("external-form");
        } else if (facts.workspaceId && facts.siteId) {
          props.formAction = nativeFormEndpoint();
          props.formWorkspaceId = facts.workspaceId;
          props.formSiteId = facts.siteId;
          props.formSourcePage = page.path;
          props.formActionId = actionIdFor(facts.goals ?? [], facts.industry ?? "");
          bound.add("native-form");
        }
        const items = Array.isArray(props.items) ? props.items as Array<Record<string, unknown>> : [];
        for (const item of contactItems(destinations)) if (!items.some((existing) => existing.title === item.title)) items.push(item);
        if (items.length) props.items = items;
      }
    }
  }

  return { site: siteSchema.parse(next), bound: [...bound] };
}

function extractDestinations(text: string) {
  const urls = [...text.matchAll(/https?:\/\/[^\s)\]}>]+/gi)].map((m) => m[0]!.replace(/[.,;]+$/, ""));
  const emails = [...text.matchAll(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)].map((m) => m[0]!);
  const phones = [...text.matchAll(/(?:\+?\d[\d\s().-]{7,}\d)/g)].map((m) => m[0]!).map(normalizePhone).filter(Boolean);
  const whatsappUrl = urls.find((u) => /wa\.me|api\.whatsapp\.com|whatsapp\.com/i.test(u));
  const mapsUrl = urls.find((u) => /maps\.google|google\.com\/maps|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(u));
  const bookingUrl = urls.find((u) => /book|appointment|calendly|zocdoc|practo|reserve|schedule/i.test(u));
  const instagram = urls.find((u) => /instagram\.com/i.test(u));
  const facebook = urls.find((u) => /facebook\.com|fb\.com/i.test(u));
  const linkedin = urls.find((u) => /linkedin\.com/i.test(u));
  const form = urls.find((u) => /form|contact|enquiry|inquiry|lead/i.test(u));
  const firstPhone = phones[0];
  return {
    whatsapp: whatsappUrl ?? (firstPhone && /whatsapp/i.test(text) ? `https://wa.me/${firstPhone.replace(/\D/g, "")}` : undefined),
    phone: firstPhone ? `tel:${firstPhone.replace(/[^+\d]/g, "")}` : undefined,
    email: emails[0] ? `mailto:${emails[0]}` : undefined,
    maps: mapsUrl,
    booking: bookingUrl,
    instagram,
    facebook,
    linkedin,
    form,
  };
}

function preferredPrimary(d: ReturnType<typeof extractDestinations>, goals: string[]): Action | undefined {
  const goalText = goals.join(" ").toLowerCase();
  if (/book|appointment|schedule/.test(goalText) && d.booking) return { label: "Book appointment", href: d.booking };
  if (/whatsapp|message|lead|contact/.test(goalText) && d.whatsapp) return { label: "WhatsApp us", href: d.whatsapp };
  if (d.booking) return { label: "Book now", href: d.booking };
  if (d.whatsapp) return { label: "WhatsApp us", href: d.whatsapp };
  if (d.phone) return { label: "Call now", href: d.phone };
  if (d.email) return { label: "Email us", href: d.email };
  return undefined;
}

function preferredSecondary(d: ReturnType<typeof extractDestinations>, primary?: string): Action | undefined {
  const choices: Action[] = [
    ...(d.phone ? [{ label: "Call", href: d.phone }] : []),
    ...(d.maps ? [{ label: "Get directions", href: d.maps }] : []),
    ...(d.email ? [{ label: "Email", href: d.email }] : []),
  ];
  return choices.find((choice) => choice.href !== primary);
}

function contactItems(d: ReturnType<typeof extractDestinations>) {
  return [
    d.phone ? { title: "Phone", description: d.phone.replace(/^tel:/, "") } : null,
    d.email ? { title: "Email", description: d.email.replace(/^mailto:/, "") } : null,
    d.maps ? { title: "Directions", description: d.maps } : null,
    d.instagram ? { title: "Instagram", description: d.instagram } : null,
    d.facebook ? { title: "Facebook", description: d.facebook } : null,
    d.linkedin ? { title: "LinkedIn", description: d.linkedin } : null,
  ].filter(Boolean) as Array<Record<string, unknown>>;
}

function actionIdFor(goals:string[],industry:string){const text=`${goals.join(" ")} ${industry}`.toLowerCase();if(/dental|clinic|medical|health|appointment/.test(text))return"appointment.request";if(/hotel|booking/.test(text))return"booking.request";if(/restaurant|reservation/.test(text))return"reservation.request";if(/property|real estate/.test(text))return"property.enquiry";if(/demo|saas|software/.test(text))return"demo.request";if(/course|school|education|enrollment/.test(text))return"enrollment.enquiry";if(/quote|construction|service/.test(text))return"quote.request";return"lead.create";}
function nativeFormEndpoint(){return process.env.NEXT_PUBLIC_MICIRQL_FORM_ENDPOINT?.trim()||"https://builder.micirql.com/api/public/leads";}
function normalizePhone(value: string) { return value.trim().replace(/\s+/g, " "); }
function kind(href: string) { if (href.startsWith("tel:")) return "phone"; if (href.startsWith("mailto:")) return "email"; if (/wa\.me|whatsapp/i.test(href)) return "whatsapp"; if (/maps/i.test(href)) return "maps"; if (/book|appointment|schedule|calendly|practo/i.test(href)) return "booking"; return "url"; }
function familyFromId(componentId: string) { const id = componentId.toLowerCase(); for (const family of ["hero","cta","contact"] as const) if (id.includes(family) || id.includes(`-${family === "hero" ? "hr" : family === "cta" ? "ct" : "cn"}-`)) return family; return null; }
