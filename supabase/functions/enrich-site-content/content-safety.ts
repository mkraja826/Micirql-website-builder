const authoringInstructionPatterns = [
  /\b(?:demo(?:\s*\/\s*test)?|test(?:ing)?)\s+(?:website|site|project)\b/i,
  /\bdo\s+not\s+(?:invent|fabricate|make\s+up|publish|show|include)\b/i,
  /\b(?:create|generate|build|design|make)\b[^.!?\n]{0,180}\b(?:website|site|page|layout|content|design)\b/i,
  /\b(?:content|image)[\s-]?rich\b/i,
  /\bfully\s+responsive\b/i,
  /\b(?:use|add|insert|show|display|include)\b[^.!?\n]{0,120}\b(?:neutral\s+)?placeholders?\b/i,
  /\bneutral\s+placeholders?\b/i,
  /\b(?:authoring|internal|prompt)\s+instructions?\b/i,
];

export function sanitizePublicBriefNotes(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const segments = value
    .trim()
    .split(/(?:\r?\n)+|(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
  const safe = segments.filter(
    (segment) =>
      !authoringInstructionPatterns.some((pattern) => pattern.test(segment)),
  );
  return safe.join(" ").trim() || null;
}
