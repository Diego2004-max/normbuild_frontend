export const sourcePreview = (content: string): string => {
  const normalized = content.trim();
  if (normalized.length <= 360) return normalized;
  const firstSentence = normalized.match(/^.*?[.!?](?:\s|$)/s)?.[0]?.trim();
  if (firstSentence && firstSentence.length >= 80 && firstSentence.length <= 360) return firstSentence;
  const prefix = normalized.slice(0, 360);
  return `${prefix.slice(0, prefix.lastIndexOf(' ')).trim()}...`;
};
