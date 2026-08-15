export const INLINE_TEXT_FIELDS = ["eyebrow", "title", "description"] as const;
export type InlineTextField = (typeof INLINE_TEXT_FIELDS)[number];
