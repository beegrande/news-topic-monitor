import OpenAI from "openai";

export interface OpenAINewsArticle {
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt: string;
  language: string;
}

export interface FetchNewsWithOpenAIOptions {
  apiKey: string;
  keywords: string;
  languages?: string[];
  maxArticles?: number;
}

export class OpenAINewsError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "OpenAINewsError";
  }
}

/**
 * Fetches news articles using OpenAI's web search capability via the Responses API.
 */
export async function fetchNewsWithOpenAI(
  options: FetchNewsWithOpenAIOptions
): Promise<OpenAINewsArticle[]> {
  const { apiKey, keywords, languages = ["en"], maxArticles = 10 } = options;

  const client = new OpenAI({ apiKey });

  const languagePreference =
    languages.length === 1 && languages[0] === "en"
      ? "English"
      : `any of these languages: ${languages.join(", ")}`;

  const prompt = `Find recent news articles about: ${keywords}
Language preference: ${languagePreference}`;

  try {
    const response = await client.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search_preview" }],
      input: [
        {
          role: "system",
          content: `You are a news research assistant. Search the web for recent news articles matching the given keywords. Return JSON with an "articles" array (max ${maxArticles} articles).

Each article object must have these fields:
- title: string (the article title)
- url: string (the full URL to the article)
- source: string (the name of the news source/publication)
- summary: string (a 1-2 sentence summary of the article)
- publishedAt: string (ISO 8601 date format, e.g., "2025-01-15T10:30:00Z")
- language: string (ISO 639-1 language code, e.g., "en", "es", "fr")

Focus on articles from the past 7 days. Include sources from any language/country as specified in the query.

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks. The response must be parseable JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract the text content from the response
    const outputText = response.output_text;

    if (!outputText) {
      throw new OpenAINewsError("No response from OpenAI", "EMPTY_RESPONSE");
    }

    // Parse the JSON response
    let parsed: { articles: OpenAINewsArticle[] };
    try {
      // Extract JSON from the response - it may be wrapped in markdown or have preamble text
      let jsonText = outputText;

      // Try to extract JSON from markdown code block first
      const codeBlockMatch = outputText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      } else {
        // Try to find JSON object starting with {"articles"
        const jsonStartIndex = outputText.indexOf('{"articles"');
        if (jsonStartIndex !== -1) {
          // Find the matching closing brace
          let braceCount = 0;
          let jsonEndIndex = jsonStartIndex;
          for (let i = jsonStartIndex; i < outputText.length; i++) {
            if (outputText[i] === '{') braceCount++;
            if (outputText[i] === '}') braceCount--;
            if (braceCount === 0) {
              jsonEndIndex = i + 1;
              break;
            }
          }
          jsonText = outputText.slice(jsonStartIndex, jsonEndIndex);
        }
      }

      parsed = JSON.parse(jsonText.trim());
    } catch {
      console.error("Failed to parse OpenAI response:", outputText);
      throw new OpenAINewsError(
        "Failed to parse news articles from OpenAI response",
        "PARSE_ERROR"
      );
    }

    if (!Array.isArray(parsed.articles)) {
      throw new OpenAINewsError(
        "Invalid response format: missing articles array",
        "INVALID_FORMAT"
      );
    }

    // Validate and filter articles
    const validArticles: OpenAINewsArticle[] = [];
    for (const article of parsed.articles) {
      if (
        typeof article.title === "string" &&
        typeof article.url === "string" &&
        typeof article.source === "string" &&
        article.title.length > 0 &&
        article.url.length > 0
      ) {
        validArticles.push({
          title: article.title,
          url: article.url,
          source: article.source || "Unknown",
          summary: article.summary || "",
          publishedAt: article.publishedAt || new Date().toISOString(),
          language: article.language || "en",
        });
      }
    }

    // Log the articles found for debugging
    console.log(`[OpenAI News] Found ${validArticles.length} articles for keywords: "${keywords}"`);
    for (const article of validArticles.slice(0, maxArticles)) {
      console.log(`  - [${article.source}] ${article.title.slice(0, 60)}...`);
      console.log(`    URL: ${article.url}`);
    }

    return validArticles.slice(0, maxArticles);
  } catch (error) {
    if (error instanceof OpenAINewsError) {
      throw error;
    }

    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        throw new OpenAINewsError("Invalid OpenAI API key", "INVALID_API_KEY");
      }
      if (error.status === 429) {
        throw new OpenAINewsError(
          "OpenAI rate limit exceeded",
          "RATE_LIMIT"
        );
      }
      if (error.status === 402) {
        throw new OpenAINewsError(
          "OpenAI billing issue - insufficient credits",
          "BILLING_ERROR"
        );
      }
      throw new OpenAINewsError(
        error.message || "OpenAI API error",
        "API_ERROR"
      );
    }

    throw new OpenAINewsError(
      error instanceof Error ? error.message : "Unknown error",
      "UNKNOWN_ERROR"
    );
  }
}

/**
 * Tests if an OpenAI API key is valid by making a simple API call.
 */
export async function testOpenAIApiKey(apiKey: string): Promise<boolean> {
  const client = new OpenAI({ apiKey });

  try {
    // Make a minimal API call to test the key
    await client.models.list();
    return true;
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      // Only return false for authentication errors
      if (error.status === 401) {
        return false;
      }
      // For other errors (rate limit, billing, etc.), the key is likely valid
      return true;
    }
    // For unexpected errors, assume the key might be valid
    return true;
  }
}
