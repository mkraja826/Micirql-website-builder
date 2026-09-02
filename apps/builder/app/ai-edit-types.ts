export type AiEditorSectionFamily =
  | "hero"
  | "about"
  | "services"
  | "features"
  | "process"
  | "testimonials"
  | "gallery"
  | "team"
  | "cta"
  | "contact";

export type AiEditorOperation =
  | {
      type: "section.variant";
      variant: 1 | 2 | 3 | 4 | 5;
      heading?: string;
      body?: string;
      rationale: string;
    }
  | {
      type: "section.copy";
      heading?: string;
      body?: string;
      rationale: string;
    }
  | {
      type: "section.add";
      family: AiEditorSectionFamily;
      position: "after-selected" | "end";
      variant?: 1 | 2 | 3 | 4 | 5;
      componentId?: string;
      version?: string;
      rationale: string;
    }
  | {
      type: "section.visibility";
      hidden: boolean;
      rationale: string;
    }
  | {
      type: "section.remove";
      rationale: string;
    }
  | {
      type: "section.move";
      direction: "up" | "down" | "top" | "bottom";
      rationale: string;
    }
  | {
      type: "media.open";
      rationale: string;
    }
  | {
      type: "functions.open";
      rationale: string;
    }
  | {
      type: "seo.patch";
      title?: string;
      description?: string;
      rationale: string;
    }
  | {
      type: "page.add";
      name: string;
      path: string;
      rationale: string;
    };

export type AiEditorTarget = {
  pageId: string;
  sectionId?: string;
};

export type AiEditorPlanStep = {
  operation: AiEditorOperation;
  target: AiEditorTarget;
};

export type AiEditorPlan = {
  operations: [AiEditorOperation, ...AiEditorOperation[]];
  steps?: [AiEditorPlanStep, ...AiEditorPlanStep[]];
  rationale: string;
};

export type AiEditorResponse = {
  operation: AiEditorOperation;
  plan?: AiEditorPlan;
  source: "ai" | "deterministic";
  model?: string;
};
