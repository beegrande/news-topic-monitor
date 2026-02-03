/**
 * Article Content Scraper Service
 *
 * Fetches and extracts article content from URLs.
 * Handles common cases like paywalls, bot blocking, and timeouts gracefully.
 */

export interface ContentFetchResult {
  content: string | null;
  success: boolean;
  error?: string;
}

const FETCH_TIMEOUT_MS = 10000; // 10 seconds
const MAX_CONTENT_LENGTH = 50000; // 50KB max content

/**
 * Fetches article content from a URL and extracts the main text.
 * Returns null on failure without throwing.
 */
export async function fetchArticleContent(url: string): Promise<ContentFetchResult> {
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsMonitor/1.0; +https://newsmonitor.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        content: null,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const content = extractArticleContent(html);

    if (!content || content.length < 100) {
      return {
        content: null,
        success: false,
        error: "Could not extract meaningful content",
      };
    }

    return {
      content: content.slice(0, MAX_CONTENT_LENGTH),
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Handle specific error cases
    if (errorMessage.includes("abort")) {
      return {
        content: null,
        success: false,
        error: "Request timed out",
      };
    }

    return {
      content: null,
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Extracts article content from HTML.
 * Uses simple heuristics to find the main article text.
 */
function extractArticleContent(html: string): string | null {
  // Remove script and style tags
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Try to find article content in order of preference
  const contentSelectors = [
    // JSON-LD structured data (most reliable when present)
    extractFromJsonLd(html),
    // Semantic HTML5 elements
    extractFromTag(cleanHtml, "article"),
    extractFromTag(cleanHtml, "main"),
    // Common class names
    extractFromClass(cleanHtml, "article-content"),
    extractFromClass(cleanHtml, "article-body"),
    extractFromClass(cleanHtml, "post-content"),
    extractFromClass(cleanHtml, "entry-content"),
    extractFromClass(cleanHtml, "story-body"),
    extractFromClass(cleanHtml, "content-body"),
    // ID-based selectors
    extractFromId(cleanHtml, "article"),
    extractFromId(cleanHtml, "content"),
    extractFromId(cleanHtml, "main-content"),
  ];

  // Return the first non-empty result
  for (const content of contentSelectors) {
    if (content && content.length > 200) {
      return cleanText(content);
    }
  }

  // Fallback: extract all paragraph text
  const paragraphs = extractParagraphs(cleanHtml);
  if (paragraphs.length > 200) {
    return cleanText(paragraphs);
  }

  return null;
}

/**
 * Extracts article text from JSON-LD structured data.
 */
function extractFromJsonLd(html: string): string | null {
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!jsonLdMatch) return null;

  try {
    const data = JSON.parse(jsonLdMatch[1]);
    // Handle array of objects
    const article = Array.isArray(data)
      ? data.find(d => d["@type"] === "Article" || d["@type"] === "NewsArticle")
      : data;

    if (article?.articleBody) {
      return article.articleBody;
    }
  } catch {
    // JSON parse error, ignore
  }

  return null;
}

/**
 * Extracts text from a specific HTML tag.
 */
function extractFromTag(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(regex);
  return match ? stripHtml(match[1]) : null;
}

/**
 * Extracts text from elements with a specific class.
 */
function extractFromClass(html: string, className: string): string | null {
  const regex = new RegExp(`<[^>]+class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)<\\/`, "i");
  const match = html.match(regex);
  return match ? stripHtml(match[1]) : null;
}

/**
 * Extracts text from an element with a specific ID.
 */
function extractFromId(html: string, id: string): string | null {
  const regex = new RegExp(`<[^>]+id="${id}"[^>]*>([\\s\\S]*?)<\\/`, "i");
  const match = html.match(regex);
  return match ? stripHtml(match[1]) : null;
}

/**
 * Extracts all paragraph content.
 */
function extractParagraphs(html: string): string {
  const paragraphs: string[] = [];
  const regex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const text = stripHtml(match[1]).trim();
    // Filter out very short paragraphs (likely navigation or ads)
    if (text.length > 50) {
      paragraphs.push(text);
    }
  }

  return paragraphs.join("\n\n");
}

/**
 * Removes HTML tags from text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ");
}

/**
 * Cleans and normalizes extracted text.
 */
function cleanText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove excessive newlines
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim();
}
