import { createHash } from "crypto";

/**
 * Normalizes text for consistent fingerprinting.
 * - Converts to lowercase
 * - Removes punctuation and special characters
 * - Collapses multiple whitespace to single space
 * - Trims leading/trailing whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

/**
 * Generates a content fingerprint (hash) for duplicate detection.
 * Uses normalized title + first 500 chars of content/summary.
 *
 * @param title - Article title
 * @param content - Article content or summary (optional)
 * @returns SHA-256 hash of the normalized content, or null if no meaningful content
 */
export function generateContentFingerprint(
  title: string,
  content?: string | null
): string | null {
  if (!title || title.trim().length === 0) {
    return null;
  }

  const normalizedTitle = normalizeText(title);

  // Use first 500 chars of content/summary for additional uniqueness
  let normalizedContent = "";
  if (content && content.trim().length > 0) {
    normalizedContent = normalizeText(content.slice(0, 500));
  }

  const fingerprintSource = `${normalizedTitle}|${normalizedContent}`;

  // Create SHA-256 hash
  const hash = createHash("sha256").update(fingerprintSource).digest("hex");

  return hash;
}

/**
 * Checks if two articles are likely duplicates based on their fingerprints.
 *
 * @param fingerprint1 - First article fingerprint
 * @param fingerprint2 - Second article fingerprint
 * @returns true if fingerprints match (duplicate), false otherwise
 */
export function areDuplicates(
  fingerprint1: string | null,
  fingerprint2: string | null
): boolean {
  if (!fingerprint1 || !fingerprint2) {
    return false;
  }
  return fingerprint1 === fingerprint2;
}
