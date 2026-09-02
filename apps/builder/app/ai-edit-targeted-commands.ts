import type { Site } from "@micirql/schema";
import { sectionDesignId, type SectionFamily } from "@micirql/sections";
import type { WorkspaceCommand } from "@micirql/workspace";
import type { AiEditorPlanStep } from "./ai-edit-types";

const MAX_TARGETED_STEPS = 3;

export type TargetedAiCommandPlan = {
  commands: WorkspaceCommand[];
  pageId: string;
  sectionIds: string[];
};

export function targetedAiPlanCommands(site: Site, steps: AiEditorPlanStep[]): TargetedAiCommandPlan | null {
  const bounded = steps.slice(0, MAX_TARGETED_STEPS);
  if (!bounded.length) return null;
  const pageId = bounded[0]?.target.pageId;
  if (!pageId || bounded.some((step) => step.target.pageId !== pageId || !step.target.sectionId)) return null;
  const page = site.pages.find((candidate) => candidate.id === pageId);
  if (!page) return null;

  const commands: WorkspaceCommand[] = [];
  const sectionIds: string[] = [];
  for (const step of bounded) {
    const sectionId = step.target.sectionId!;
    const section = page.sections.find((candidate) => candidate.id === sectionId);
    if (!section) return null;
    if (step.operation.type !== "section.variant" && step.operation.type !== "section.copy") return null;
    if (!sectionIds.includes(sectionId)) sectionIds.push(sectionId);

    if (step.operation.type === "section.variant") {
      const family = familyFromComponentId(section.component.componentId);
      if (!family) return null;
      commands.push({
        type: "section.component.set",
        pageId,
        sectionId,
        componentId: sectionDesignId(site.theme.family, family, step.operation.variant),
        version: section.component.version,
      });
    }
    if (step.operation.heading) commands.push({
      type: "content.set",
      pageId,
      sectionId,
      propPath: section.props.title !== undefined ? "title" : "heading",
      value: step.operation.heading,
    });
    if (step.operation.body) commands.push({
      type: "content.set",
      pageId,
      sectionId,
      propPath: section.props.description !== undefined ? "description" : "body",
      value: step.operation.body,
    });
  }

  return commands.length ? { commands, pageId, sectionIds } : null;
}

function familyFromComponentId(componentId: string): SectionFamily | undefined {
  const id = componentId.toLowerCase();
  const families: SectionFamily[] = ["hero", "about", "services", "features", "process", "testimonials", "gallery", "team", "faq", "cta", "contact"];
  return families.find((family) => id.startsWith(`${family}.`) || id.includes(`-${family === "services" ? "serv" : family === "features" ? "feat" : family === "process" ? "proc" : family === "testimonials" ? "test" : family === "gallery" ? "gall" : family === "contact" ? "cont" : family}-`));
}
