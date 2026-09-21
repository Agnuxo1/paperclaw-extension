export const MIN_DESCRIPTION_LENGTH = 30;
export const MAX_DESCRIPTION_LENGTH = 4000;

export interface GenerateRequest {
  description: string;
  author: string;
  title?: string;
  tags: string[];
  client: string;
}

export function validateDescription(value: string): string | null {
  const text = value.trim();
  if (text.length === 0) return null;
  if (text.length < MIN_DESCRIPTION_LENGTH) {
    return `Add ${MIN_DESCRIPTION_LENGTH - text.length} more characters.`;
  }
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    return `Too long. Trim to under ${MAX_DESCRIPTION_LENGTH} characters.`;
  }
  return null;
}

export function normalizeTags(rawTags: string): string[] {
  return rawTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function extractMarkdownTitle(markdown: string): string | null {
  const match = markdown.match(/^\s*#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : null;
}

export function buildGenerateRequest(
  description: string,
  author: string,
  title: string | undefined,
  tags: string[],
  client: string,
): GenerateRequest {
  return { description, author, title, tags, client };
}
