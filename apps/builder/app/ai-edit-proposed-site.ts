import type { Site, SitePage, SiteSection } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import type { AiEditorOperation, AiEditorSectionFamily } from "./ai-edit-types";

export type AiVisualProposal = {
  site?: Site;
  path: string;
  selectedSectionId?: string;
  note?: string;
};

export function proposedSiteForAiEdit(site: Site, pageId: string, sectionId: string | undefined, operation: AiEditorOperation): AiVisualProposal {
  const sourcePage = site.pages.find((page) => page.id === pageId) ?? site.pages[0];
  if (!sourcePage) return { path: "/", note: "No page is available to preview." };
  if (operation.type === "seo.patch") return { path: sourcePage.path, note: "SEO metadata changes do not alter the page canvas." };
  if (operation.type === "media.open") return { path: sourcePage.path, note: "MiCirql will open Media before any image is changed." };
  if (operation.type === "functions.open") return { path: sourcePage.path, note: "MiCirql will open Functions before any action is changed." };

  const next = structuredClone(site);
  const page = next.pages.find((candidate) => candidate.id === sourcePage.id)!;

  if (operation.type === "page.add") {
    const previewPage = previewNewPage(next, operation.name, operation.path);
    next.pages.push(previewPage);
    return { site: next, path: previewPage.path };
  }

  const selectedIndex = sectionId ? page.sections.findIndex((section) => section.id === sectionId) : -1;
  const selected = selectedIndex >= 0 ? page.sections[selectedIndex] : undefined;

  if (operation.type === "section.add") {
    const section = previewNewSection(next, operation.family, operation.variant ?? 2, operation.componentId, operation.version);
    const toIndex = operation.position === "after-selected" && selectedIndex >= 0 ? selectedIndex + 1 : page.sections.length;
    page.sections.splice(toIndex, 0, section);
    return { site: next, path: page.path, selectedSectionId: section.id };
  }
  if (!selected) return { path: page.path, note: "Select a section to preview this change visually." };

  if (operation.type === "section.visibility") selected.hidden = operation.hidden;
  if (operation.type === "section.remove") page.sections.splice(selectedIndex, 1);
  if (operation.type === "section.move") {
    const [moving] = page.sections.splice(selectedIndex, 1);
    const toIndex = operation.direction === "top" ? 0 : operation.direction === "bottom" ? page.sections.length : operation.direction === "up" ? Math.max(0, selectedIndex - 1) : Math.min(page.sections.length, selectedIndex + 1);
    page.sections.splice(toIndex, 0, moving!);
  }
  if (operation.type === "section.copy" || operation.type === "section.variant") {
    if (operation.type === "section.variant") {
      const family = familyFromComponentId(selected.component.componentId);
      if (family) selected.component.componentId = sectionDesignId(next.theme.family, family, operation.variant);
    }
    if (operation.heading) selected.props[selected.props.title !== undefined ? "title" : "heading"] = operation.heading;
    if (operation.body) selected.props[selected.props.description !== undefined ? "description" : "body"] = operation.body;
  }

  return { site: next, path: page.path, selectedSectionId: operation.type === "section.remove" ? undefined : selected.id };
}

function previewNewSection(site: Site, family: AiEditorSectionFamily, variant: 1 | 2 | 3 | 4 | 5, componentId?: string, version?: string): SiteSection {
  return {
    id: `ai-preview-${family}`,
    component: { componentId: componentId ?? sectionDesignId(site.theme.family, family, variant), version: version ?? "1.0.0" },
    props: defaultProps(family),
    bindings: {},
    hidden: false,
  };
}

function previewNewPage(site: Site, name: string, path: string): SitePage {
  return {
    id: "ai-preview-page",
    path,
    name,
    sections: [previewNewSection(site, "hero", 2), previewNewSection(site, "about", 1), previewNewSection(site, "cta", 2)],
    seo: { title: `${name} | ${site.name}`, description: `Learn more about ${name.toLowerCase()} from ${site.name}.`, canonicalPath: path, indexable: true, structuredDataTypes: [] },
  };
}

function defaultProps(family: AiEditorSectionFamily): Record<string, unknown> {
  switch (family) {
    case "hero": return { eyebrow: "Your business", heading: "A clear headline for your visitors", body: "Add the main message you want visitors to understand first.", ctaLabel: "Get in touch" };
    case "about": return { heading: "About us", body: "Tell visitors what makes your business useful, credible and different." };
    case "services": return { heading: "Services", body: "Introduce the services you want visitors to explore.", items: [] };
    case "features": return { heading: "Why choose us", body: "Highlight the strengths that matter most to customers.", items: [] };
    case "process": return { heading: "How it works", body: "Explain the next steps clearly.", items: [] };
    case "testimonials": return { heading: "What customers say", body: "Add verified customer feedback here.", items: [] };
    case "gallery": return { heading: "Gallery", body: "Showcase your work, space or products.", items: [] };
    case "team": return { heading: "Meet the team", body: "Introduce the people behind the business.", items: [] };
    case "cta": return { heading: "Ready to get started?", body: "Give visitors one clear next step.", ctaLabel: "Get started" };
    case "contact": return { heading: "Contact us", body: "Make it easy for visitors to reach your team.", ctaLabel: "Contact us" };
  }
}

function familyFromComponentId(componentId: string): SectionFamily | undefined {
  const id = componentId.toLowerCase();
  const families: SectionFamily[] = ["hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "faq", "cta", "contact"];
  return families.find((family) => id.startsWith(`${family}.`) || id.includes(`-${family === "services" ? "serv" : family === "features" ? "feat" : family === "process" ? "proc" : family === "testimonials" ? "test" : family === "gallery" ? "gall" : family === "contact" ? "cont" : family}-`));
}
