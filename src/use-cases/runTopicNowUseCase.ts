import { findTopicById, updateTopicLastChecked, updateTopicError } from "~/data-access/topics";
import { createArticleIfNotExists, linkArticleToTopic } from "~/data-access/articles";
import { getOpenAIApiKey } from "~/data-access/api-keys";
import { generateContentFingerprint } from "~/services/content-fingerprint";
import { fetchNewsWithOpenAI, OpenAINewsError } from "~/services/openai-news";
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
 * Used for the "Run now" feature.
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

  // Get user's API key
  const apiKey = await getOpenAIApiKey(userId);
  if (!apiKey) {
    return {
      success: false,
      articlesFound: 0,
      articlesCreated: 0,
      error: "OpenAI API key not configured. Please add your API key in Settings.",
    };
  }

  try {
    // Parse languages
    const languages = parseLanguageList(topic.languages);

    // Fetch news using OpenAI
    const articles = await fetchNewsWithOpenAI({
      apiKey,
      keywords: topic.keywords,
      languages,
      maxArticles: 10,
    });

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
      }
    }

    // Update the topic's lastCheckedAt timestamp
    await updateTopicLastChecked(topicId);

    return {
      success: true,
      articlesFound: articles.length,
      articlesCreated,
    };
  } catch (error) {
    const errorMessage = error instanceof OpenAINewsError
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
