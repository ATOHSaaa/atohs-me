const MAX_DESCRIPTION_LENGTH = 160;

export const createPostDescription = (body: string) => {
  const firstParagraph =
    body
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block && !block.startsWith('#')) ?? '';

  const plainText = firstParagraph
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+?)\s+(https?:\/\/[^\s\]]+)\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return plainText.length > MAX_DESCRIPTION_LENGTH
    ? `${plainText.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`
    : plainText;
};
