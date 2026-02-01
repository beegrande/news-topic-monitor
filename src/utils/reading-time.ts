/**
 * Calculate estimated reading time for text content.
 * Uses an average reading speed of 200 words per minute.
 */

const WORDS_PER_MINUTE = 200;

/**
 * Count words in a string, handling null/undefined values.
 */
function countWords(text: string | null | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate reading time from article content fields.
 * Combines title, summary, and content for total word count.
 *
 * @returns Reading time in minutes (minimum 1)
 */
export function calculateReadingTimeMinutes(
  title: string | null | undefined,
  summary: string | null | undefined,
  content: string | null | undefined
): number {
  const totalWords = countWords(title) + countWords(summary) + countWords(content);
  const minutes = Math.ceil(totalWords / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
}

/**
 * Format reading time as a user-friendly string.
 *
 * @returns Formatted string (e.g., "3 min read")
 */
export function formatReadingTime(
  title: string | null | undefined,
  summary: string | null | undefined,
  content: string | null | undefined
): string {
  const minutes = calculateReadingTimeMinutes(title, summary, content);
  return `${minutes} min read`;
}
