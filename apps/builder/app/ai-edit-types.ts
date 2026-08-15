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
      type: "page.add";
      name: string;
      path: string;
      rationale: string;
    };

export type AiEditorResponse = {
  operation: AiEditorOperation;
  source: "ai" | "deterministic";
  model?: string;
};
