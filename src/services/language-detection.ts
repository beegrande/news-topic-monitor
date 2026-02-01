// Map of ISO 639-1 codes to language names
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ru: "Russian",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
  ar: "Arabic",
  hi: "Hindi",
  sv: "Swedish",
  no: "Norwegian",
  da: "Danish",
  fi: "Finnish",
  pl: "Polish",
  tr: "Turkish",
  vi: "Vietnamese",
  th: "Thai",
  id: "Indonesian",
  cs: "Czech",
  el: "Greek",
  he: "Hebrew",
  hu: "Hungarian",
  ro: "Romanian",
  uk: "Ukrainian",
  ca: "Catalan",
};

// Character patterns for basic language detection (with global flag for counting matches)
// Order matters: more specific patterns first
const LANGUAGE_PATTERNS: [string, RegExp][] = [
  // Japanese Hiragana/Katakana is unique to Japanese, so check first
  ["ja", /[\u3040-\u309F\u30A0-\u30FF]/g],  // Hiragana + Katakana
  ["ko", /[\uAC00-\uD7AF]/g],               // Korean Hangul
  ["ar", /[\u0600-\u06FF]/g],               // Arabic
  ["he", /[\u0590-\u05FF]/g],               // Hebrew
  ["ru", /[\u0400-\u04FF]/g],               // Cyrillic
  ["el", /[\u0370-\u03FF]/g],               // Greek
  ["th", /[\u0E00-\u0E7F]/g],               // Thai
  ["hi", /[\u0900-\u097F]/g],               // Devanagari (Hindi)
  // Chinese characters last (also matches Japanese Kanji, but if no Hiragana/Katakana found, it's likely Chinese)
  ["zh", /[\u4E00-\u9FFF]/g],               // Chinese characters (CJK Unified Ideographs)
];

// NewsAPI supported languages
export const NEWSAPI_SUPPORTED_LANGUAGES = [
  "ar",
  "de",
  "en",
  "es",
  "fr",
  "he",
  "it",
  "nl",
  "no",
  "pt",
  "ru",
  "sv",
  "zh",
];

export interface LanguageDetectionResult {
  language: string; // ISO 639-1 code (e.g., "en", "es")
  confidence: number; // 0-1 confidence score
  languageName: string; // Human-readable name (e.g., "English")
}

/**
 * Detects the language of the given text using character pattern matching.
 * This is a simple heuristic-based approach that works well for distinguishing
 * between different script families (Latin, CJK, Arabic, etc.)
 *
 * @param text - The text to analyze
 * @param fallbackLanguage - Language to return if detection fails (default: "en")
 * @returns The detected language code (ISO 639-1), confidence score, and language name
 */
export function detectLanguage(
  text: string,
  fallbackLanguage: string = "en"
): LanguageDetectionResult {
  if (!text || text.trim().length < 10) {
    // Too short for reliable detection, use fallback
    return {
      language: fallbackLanguage,
      confidence: 0,
      languageName: SUPPORTED_LANGUAGES[fallbackLanguage] || "Unknown",
    };
  }

  // Check for non-Latin scripts first (more reliable detection)
  for (const [lang, pattern] of LANGUAGE_PATTERNS) {
    const matches = text.match(pattern);
    // Need at least 3 characters of the script to detect
    if (matches && matches.length >= 3) {
      return {
        language: lang,
        confidence: 0.9,
        languageName: SUPPORTED_LANGUAGES[lang] || "Unknown",
      };
    }
  }

  // For Latin-based scripts, use fallback language
  // This is because distinguishing between Latin-script languages
  // requires more sophisticated analysis
  return {
    language: fallbackLanguage,
    confidence: 0.7,
    languageName: SUPPORTED_LANGUAGES[fallbackLanguage] || "Unknown",
  };
}

/**
 * Detects the language of an article using its title and content/summary.
 * Prioritizes content over title for more accurate detection.
 *
 * @param title - The article title
 * @param content - The article content or summary
 * @param fallbackLanguage - Language to return if detection fails (default: "en")
 * @returns The detected language information
 */
export function detectArticleLanguage(
  title: string,
  content?: string | null,
  fallbackLanguage: string = "en"
): LanguageDetectionResult {
  // Prefer content for detection as it's usually longer
  const textToAnalyze = content && content.length > 50 ? content : title;
  return detectLanguage(textToAnalyze, fallbackLanguage);
}

/**
 * Parses a comma-separated language string into an array of language codes.
 *
 * @param languages - Comma-separated language codes (e.g., "en,es,fr")
 * @returns Array of language codes
 */
export function parseLanguageList(
  languages: string | null | undefined
): string[] {
  if (!languages || languages.trim() === "") {
    return ["en"]; // Default to English
  }
  return languages
    .split(",")
    .map((lang) => lang.trim().toLowerCase())
    .filter((lang) => lang.length > 0);
}

/**
 * Gets the language name for an ISO 639-1 code.
 *
 * @param code - ISO 639-1 language code
 * @returns The language name, or the code itself if unknown
 */
export function getLanguageName(code: string): string {
  return SUPPORTED_LANGUAGES[code.toLowerCase()] || code.toUpperCase();
}

/**
 * Checks if a language code is supported by NewsAPI.
 *
 * @param code - ISO 639-1 language code
 * @returns Whether the language is supported by NewsAPI
 */
export function isNewsApiLanguageSupported(code: string): boolean {
  return NEWSAPI_SUPPORTED_LANGUAGES.includes(code.toLowerCase());
}
