import { findTopicById, updateTopicLastChecked, updateTopicError } from "~/data-access/topics";
import { createArticleIfNotExists, linkArticleToTopic } from "~/data-access/articles";
import { getOpenAIApiKey, getAnthropicApiKey, getNewsProvider } from "~/data-access/api-keys";
import { generateContentFingerprint } from "~/services/content-fingerprint";
import { fetchNewsWithOpenAI, OpenAINewsError } from "~/services/openai-news";
import { fetchNewsWithAnthropic, AnthropicNewsError } from "~/services/anthropic-news";
import { parseLanguageList } from "~/services/language-detection";
import { translateArticleSummary } from "~/services/translation";

export interface RunTopicNowResult {
  success: boolean;
  articlesFound: number;
  articlesCreated: number;
  error?: string;
}

/**
 * Manually triggers a news fetch for a single topic.
 * Uses the user's selected news provider (OpenAI or Anthropic).
 */
export async function runTopicNowUseCase(
  topicId: string,
  userId: string
): Promise<RunTopicNowResult> {
  // Get the topic
  const topic = await findTopicById(topicId);
  if (!topic) {
    return { success: false, articlesFound: 0, articlesCreated: 0, error: "Topic not found" };
  }

  // Verify ownership
  if (topic.userId !== userId) {
    return { success: false, articlesFound: 0, articlesCreated: 0, error: "Unauthorized" };
  }

  // Get user's selected provider
  const provider = await getNewsProvider(userId);

  // Get the appropriate API key based on provider
  let apiKey: string | null;
  if (provider === "anthropic") {
    apiKey = await getAnthropicApiKey(userId);
    if (!apiKey) {
      return {
        success: false,
        articlesFound: 0,
        articlesCreated: 0,
        error: "Anthropic API key not configured. Please add your API key in Settings.",
      };
    }
  } else {
    apiKey = await getOpenAIApiKey(userId);
    if (!apiKey) {
      return {
        success: false,
        articlesFound: 0,
        articlesCreated: 0,
        error: "OpenAI API key not configured. Please add your API key in Settings.",
      };
    }
  }

  try {
    // Parse languages
    const languages = parseLanguageList(topic.languages);

    console.log("\n" + "=".repeat(60));
    console.log("[Run Topic Now] Starting manual fetch for topic:", topic.name);
    console.log("[Run Topic Now] Topic ID:", topicId);
    console.log("[Run Topic Now] Keywords:", topic.keywords);
    console.log("[Run Topic Now] Languages:", languages.join(", ") || "en (default)");
    console.log("[Run Topic Now] Provider:", provider);
    console.log("=".repeat(60));

    // Fetch news using the selected provider
    const articles = provider === "anthropic"
      ? await fetchNewsWithAnthropic({
          apiKey,
          keywords: topic.keywords,
          languages,
          maxArticles: 10,
        })
      : await fetchNewsWithOpenAI({
          apiKey,
          keywords: topic.keywords,
          languages,
          maxArticles: 10,
        });

    console.log("\n[Run Topic Now] Fetch complete. Articles returned:", articles.length);

    let articlesCreated = 0;

    for (const articleData of articles) {
      // Translate summary if not in English
      const translatedSummary = await translateArticleSummary(
        articleData.summary || undefined,
        articleData.language
      );

      // Generate content fingerprint for duplicate detection
      const contentHash = generateContentFingerprint(
        articleData.title,
        articleData.summary
      );

      const { article, created } = await createArticleIfNotExists({
        id: crypto.randomUUID(),
        title: articleData.title,
        url: articleData.url,
        source: articleData.source,
        summary: articleData.summary || undefined,
        publishedAt: articleData.publishedAt ? new Date(articleData.publishedAt) : undefined,
        contentHash,
        language: articleData.language,
        originalLanguage: articleData.language !== "en" ? articleData.language : undefined,
        translatedSummary: translatedSummary || undefined,
      });

      // Link the article to the topic
      await linkArticleToTopic(article.id, topicId);

      if (created) {
        articlesCreated++;
        console.log(`[Run Topic Now] ✓ NEW article saved: "${articleData.title.slice(0, 50)}..."`);
      } else {
        console.log(`[Run Topic Now] - Duplicate skipped: "${articleData.title.slice(0, 50)}..."`);
      }
    }

    console.log("\n[Run Topic Now] SUMMARY:");
    console.log(`[Run Topic Now] - Articles found: ${articles.length}`);
    console.log(`[Run Topic Now] - New articles created: ${articlesCreated}`);
    console.log(`[Run Topic Now] - Duplicates skipped: ${articles.length - articlesCreated}`);
    console.log("=".repeat(60) + "\n");

    // Update the topic's lastCheckedAt timestamp
    await updateTopicLastChecked(topicId);

    return {
      success: true,
      articlesFound: articles.length,
      articlesCreated,
    };
  } catch (error) {
    const errorMessage =
      error instanceof OpenAINewsError || error instanceof AnthropicNewsError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown error";

    await updateTopicError(topicId, errorMessage);

    return {
      success: false,
      articlesFound: 0,
      articlesCreated: 0,
      error: errorMessage,
    };
  }
}
