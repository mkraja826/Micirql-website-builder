import type { Site } from "@micirql/schema";

export type MissingInformationPriority = "high" | "recommended" | "optional";
export type MissingInformationItem = {
  id: string;
  priority: MissingInformationPriority;
  title: string;
  detail: string;
  pageId?: string;
  sectionId?: string;
  action: "content" | "images" | "functions" | "pages";
};

export type MissingInformationReport = {
  completion: number;
  highPriority: number;
  items: MissingInformationItem[];
};

/**
 * Finds business facts/content that MiCirql should ask the user to complete.
 * This is intentionally non-blocking: structural readiness is handled elsewhere.
 */
export function analyzeMissingInformation(site: Site): MissingInformationReport {
  const items: MissingInformationItem[] = [];
  const pages = site.pages;
  const sections = pages.flatMap((page) => page.sections.map((section) => ({ page, section, family: familyFromComponentId(section.component.componentId) })));

  const contact = sections.find((entry) => entry.family === "contact");
  if (contact) {
    const text = JSON.stringify(contact.section.props).toLowerCase();
    const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
    const hasPhone = /(?:\+?\d[\d\s().-]{7,}\d)/.test(text);
    const hasAddress = hasAnyKey(contact.section.props, ["address", "location", "street"]);
    if (!hasEmail && !hasPhone) items.push({ id: "contact-channel", priority: "high", title: "Add a contact method", detail: "Add a real phone number or email so visitors can reach the business.", pageId: contact.page.id, sectionId: contact.section.id, action: "content" });
    if (!hasAddress) items.push({ id: "contact-address", priority: "recommended", title: "Add business location", detail: "Add an address or service location if customers visit or local SEO matters.", pageId: contact.page.id, sectionId: contact.section.id, action: "content" });
  }

  const team = sections.find((entry) => entry.family === "team");
  if (team) {
    const members = Array.isArray(team.section.props.items) ? team.section.props.items : [];
    const hasRealMember = members.some((member) => isRecord(member) && meaningful(member.title ?? member.name) && !placeholder(String(member.title ?? member.name ?? "")));
    if (!hasRealMember) items.push({ id: "team-details", priority: "recommended", title: "Add team or expert details", detail: "Names, roles and credentials stay as placeholders until you supply verified details.", pageId: team.page.id, sectionId: team.section.id, action: "content" });
  }

  const proof = sections.find((entry) => entry.family === "testimonials");
  if (proof) {
    const entries = Array.isArray(proof.section.props.items) ? proof.section.props.items : [];
    if (!entries.length) items.push({ id: "verified-proof", priority: "optional", title: "Add verified customer proof", detail: "Testimonials, ratings and results are intentionally left empty unless you provide them.", pageId: proof.page.id, sectionId: proof.section.id, action: "content" });
  }

  const gallery = sections.find((entry) => entry.family === "gallery");
  if (gallery) {
    const entries = Array.isArray(gallery.section.props.items) ? gallery.section.props.items : [];
    const imageCount = countImages(gallery.section.props) + entries.reduce((count, item) => count + (isRecord(item) ? countImages(item) : 0), 0);
    if (!imageCount) items.push({ id: "gallery-photos", priority: "recommended", title: "Upload real photos", detail: "The gallery layout is ready; add real business, project, product or case photos when available.", pageId: gallery.page.id, sectionId: gallery.section.id, action: "images" });
  }

  for (const entry of sections.filter((candidate) => ["hero", "about", "services", "features"].includes(candidate.family))) {
    if (needsImage(entry.section.props) && !countImages(entry.section.props)) {
      items.push({ id: `image-${entry.page.id}-${entry.section.id}`, priority: entry.family === "hero" ? "recommended" : "optional", title: entry.family === "hero" ? "Add a hero photo" : `Add ${entry.family} imagery`, detail: "The design already reserves the correct image ratio; upload a real photo when ready.", pageId: entry.page.id, sectionId: entry.section.id, action: "images" });
    }
  }

  const contactBindings = sections.filter((entry) => entry.family === "contact" || entry.family === "cta");
  if (contactBindings.length && !contactBindings.some((entry) => Object.keys(entry.section.bindings ?? {}).length > 0)) {
    items.push({
      id: "conversion-action",
      priority: "high",
      title: "Connect the main enquiry action",
      detail: "Choose what the primary CTA should do: form, booking, phone, email or another connected action.",
      ...(contact ? { pageId: contact.page.id, sectionId: contact.section.id } : {}),
      action: "functions",
    });
  }

  const deduped = [...new Map(items.map((item) => [item.id, item])).values()];
  const weightedTotal = deduped.reduce((sum, item) => sum + weight(item.priority), 0);
  const completion = Math.max(0, Math.round(100 - Math.min(70, weightedTotal * 7)));
  return { completion, highPriority: deduped.filter((item) => item.priority === "high").length, items: deduped.sort((a, b) => weight(b.priority) - weight(a.priority)) };
}

function weight(priority: MissingInformationPriority) { return priority === "high" ? 3 : priority === "recommended" ? 2 : 1; }
function familyFromComponentId(componentId: string): string {
  const value = componentId.toLowerCase();
  const families = ["navbar", "hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "cta", "contact", "footer"];
  for (const family of families) if (value === `${family}.placeholder` || value.startsWith(`${family}.`)) return family;
  const codes: Record<string, string> = { nav: "navbar", hero: "hero", about: "about", serv: "services", feat: "features", proc: "process", test: "testimonials", gall: "gallery", team: "team", cta: "cta", cont: "contact", foot: "footer" };
  for (const [code, family] of Object.entries(codes)) if (value.includes(`-${code}-`)) return family;
  return "content";
}
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function meaningful(value: unknown) { return typeof value === "string" && value.trim().length > 1; }
function placeholder(value: string) { return /^(name|doctor|member|team member|person|expert|professional|add |your )/i.test(value.trim()); }
function hasAnyKey(props: Record<string, unknown>, keys: string[]) { const haystack = JSON.stringify(props).toLowerCase(); return keys.some((key) => haystack.includes(`\"${key}\"`)); }
function countImages(props: Record<string, unknown>) { const value = JSON.stringify(props); return (value.match(/\"assetId\"\s*:\s*\"[^\"]+\"/g) ?? []).length + (value.match(/https?:\/\/[^\"\s]+\.(?:jpg|jpeg|png|webp)/gi) ?? []).length; }
function needsImage(props: Record<string, unknown>) { const mode = String(props.imageSlotMode ?? props.mediaMode ?? "").toLowerCase(); return mode === "section" || mode === "items" || mode === "both" || Boolean(props.imageRatio || props.mediaRatio); }
