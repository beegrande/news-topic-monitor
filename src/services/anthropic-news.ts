import Anthropic from "@anthropic-ai/sdk";

export interface AnthropicNewsArticle {
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt: string;
  language: string;
}

export interface FetchNewsWithAnthropicOptions {
  apiKey: string;
  keywords: string;
  languages?: string[];
  maxArticles?: number;
}

export class AnthropicNewsError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "AnthropicNewsError";
  }
}

/**
 * Fetches news articles using Anthropic Claude with web search capability.
 */
export async function fetchNewsWithAnthropic(
  options: FetchNewsWithAnthropicOptions
): Promise<AnthropicNewsArticle[]> {
  const { apiKey, keywords, languages = ["en"], maxArticles = 10 } = options;

  console.log("\n" + "=".repeat(60));
  console.log("[Anthropic News] Starting news fetch");
  console.log("[Anthropic News] Keywords:", keywords);
  console.log("[Anthropic News] Languages:", languages.join(", "));
  console.log("[Anthropic News] Max articles:", maxArticles);
  console.log("=".repeat(60));

  const client = new Anthropic({ apiKey });

  const languagePreference =
    languages.length === 1 && languages[0] === "en"
      ? "English"
      : `any of these languages: ${languages.join(", ")}`;

  try {
    console.log("[Anthropic News] Calling Claude API with web search...");
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 5,
        },
      ],
      messages: [
        {
          role: "user",
          content: `Search the web for recent news articles about: ${keywords}
Language preference: ${languagePreference}

Find up to ${maxArticles} recent news articles from the past 7 days. For each article, provide:
- title: The article headline
- url: The full URL to the article
- source: The name of the news publication
- summary: A 1-2 sentence summary
- publishedAt: The publication date in ISO 8601 format (e.g., "2025-01-15T10:30:00Z")
- language: The language code (e.g., "en", "es", "fr")

Return ONLY a valid JSON object with an "articles" array. No markdown, no explanations, just the JSON.`,
        },
      ],
    });

    // Extract text content from the response
    let outputText = "";
    for (const block of response.content) {
      if (block.type === "text") {
        outputText += block.text;
      }
    }

    console.log("[Anthropic News] API response received");
    console.log("[Anthropic News] Response length:", outputText.length, "chars");
    console.log("[Anthropic News] Raw response (first 500 chars):");
    console.log(outputText.slice(0, 500));
    if (outputText.length > 500) {
      console.log("... (truncated)");
    }

    if (!outputText) {
      console.log("[Anthropic News] ERROR: Empty response from API");
      throw new AnthropicNewsError("No response from Anthropic", "EMPTY_RESPONSE");
    }

    // Parse the JSON response
    let parsed: { articles: AnthropicNewsArticle[] };
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
      console.log("[Anthropic News] Successfully parsed JSON");
      console.log("[Anthropic News] Articles in response:", parsed.articles?.length || 0);
    } catch (parseError) {
      console.error("[Anthropic News] JSON PARSE ERROR:", parseError);
      console.error("[Anthropic News] Failed to parse response:", outputText);
      throw new AnthropicNewsError(
        "Failed to parse news articles from Anthropic response",
        "PARSE_ERROR"
      );
    }

    if (!Array.isArray(parsed.articles)) {
      console.log("[Anthropic News] ERROR: Response missing articles array");
      throw new AnthropicNewsError(
        "Invalid response format: missing articles array",
        "INVALID_FORMAT"
      );
    }

    // Validate and filter articles
    console.log("\n[Anthropic News] Processing articles...");
    const validArticles: AnthropicNewsArticle[] = [];
    for (const article of parsed.articles) {
      if (
        typeof article.title === "string" &&
        typeof article.url === "string" &&
        typeof article.source === "string" &&
        article.title.length > 0 &&
        article.url.length > 0
      ) {
        console.log(`[Anthropic News] ✓ Valid article: "${article.title.slice(0, 50)}..."`);
        console.log(`[Anthropic News]   Source: ${article.source}`);
        console.log(`[Anthropic News]   URL: ${article.url}`);
        console.log(`[Anthropic News]   Published: ${article.publishedAt}`);
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
    console.log(`[Anthropic News] Found ${validArticles.length} articles for keywords: "${keywords}"`);
    for (const article of validArticles.slice(0, maxArticles)) {
      console.log(`  - [${article.source}] ${article.title.slice(0, 60)}...`);
      console.log(`    URL: ${article.url}`);
    }

    return validArticles.slice(0, maxArticles);
  } catch (error) {
    if (error instanceof AnthropicNewsError) {
      throw error;
    }

    // Handle Anthropic API errors
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new AnthropicNewsError("Invalid Anthropic API key", "INVALID_API_KEY");
      }
      if (error.status === 429) {
        throw new AnthropicNewsError(
          "Anthropic rate limit exceeded",
          "RATE_LIMIT"
        );
      }
      if (error.status === 402) {
        throw new AnthropicNewsError(
          "Anthropic billing issue - insufficient credits",
          "BILLING_ERROR"
        );
      }
      throw new AnthropicNewsError(
        error.message || "Anthropic API error",
        "API_ERROR"
      );
    }

    throw new AnthropicNewsError(
      error instanceof Error ? error.message : "Unknown error",
      "UNKNOWN_ERROR"
    );
  }
}

/**
 * Tests if an Anthropic API key is valid by making a simple API call.
 */
export async function testAnthropicApiKey(apiKey: string): Promise<boolean> {
  const client = new Anthropic({ apiKey });

  try {
    // Make a minimal API call to test the key
    await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 10,
      messages: [{ role: "user", content: "Hi" }],
    });
    return true;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
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
