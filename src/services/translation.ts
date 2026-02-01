import { privateEnv } from "~/config/privateEnv";

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  wasTranslated: boolean;
}

/**
 * Translates text to English using a translation API.
 * If no API key is configured or translation fails, returns the original text.
 *
 * @param text - The text to translate
 * @param sourceLanguage - The source language code (ISO 639-1)
 * @returns The translation result
 */
export async function translateToEnglish(
  text: string,
  sourceLanguage: string
): Promise<TranslationResult> {
  // If already in English, no translation needed
  if (sourceLanguage === "en") {
    return {
      translatedText: text,
      sourceLanguage: "en",
      targetLanguage: "en",
      wasTranslated: false,
    };
  }

  // Check if translation API key is configured
  const apiKey = (privateEnv as Record<string, string | undefined>)
    .GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) {
    // No API key configured - return original text
    return {
      translatedText: text,
      sourceLanguage,
      targetLanguage: "en",
      wasTranslated: false,
    };
  }

  try {
    // Call Google Cloud Translation API
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          source: sourceLanguage,
          target: "en",
          format: "text",
        }),
      }
    );

    if (!response.ok) {
      console.warn(
        `Translation API error: ${response.status} ${response.statusText}`
      );
      return {
        translatedText: text,
        sourceLanguage,
        targetLanguage: "en",
        wasTranslated: false,
      };
    }

    const data = await response.json();
    const translatedText =
      data?.data?.translations?.[0]?.translatedText || text;

    return {
      translatedText,
      sourceLanguage,
      targetLanguage: "en",
      wasTranslated: true,
    };
  } catch (error) {
    console.warn("Translation failed:", error);
    return {
      translatedText: text,
      sourceLanguage,
      targetLanguage: "en",
      wasTranslated: false,
    };
  }
}

/**
 * Translates an article summary to English if it's in a different language.
 * Returns null if the summary is already in English or translation is not available.
 *
 * @param summary - The article summary
 * @param sourceLanguage - The detected language of the summary
 * @returns The translated summary, or null if no translation was performed
 */
export async function translateArticleSummary(
  summary: string | null | undefined,
  sourceLanguage: string
): Promise<string | null> {
  if (!summary || sourceLanguage === "en") {
    return null;
  }

  const result = await translateToEnglish(summary, sourceLanguage);
  return result.wasTranslated ? result.translatedText : null;
}
