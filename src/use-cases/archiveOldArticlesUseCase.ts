import {
  archiveOldArticles,
  getArchiveStats,
  type ArchiveResult,
  type ArchiveStats,
} from "~/data-access/articles";

export interface ArchiveOldArticlesResult {
  success: boolean;
  archiveResult: ArchiveResult;
  stats: ArchiveStats;
  message: string;
}

/**
 * Archives articles older than the specified number of days.
 * This use case is designed to be called by a cron job to automatically
 * reduce database size by archiving old articles.
 *
 * Archived articles are not deleted - they remain queryable through
 * dedicated archive functions if needed for historical analysis.
 *
 * @param daysOld - Number of days after which articles should be archived (default: 30)
 * @returns Result containing archive statistics
 */
export async function archiveOldArticlesUseCase(
  daysOld: number = 30
): Promise<ArchiveOldArticlesResult> {
  try {
    // Archive articles older than threshold
    const archiveResult = await archiveOldArticles(daysOld);

    // Get updated stats
    const stats = await getArchiveStats();

    const message =
      archiveResult.archivedCount > 0
        ? `Successfully archived ${archiveResult.archivedCount} articles older than ${daysOld} days`
        : `No articles found older than ${daysOld} days to archive`;

    return {
      success: true,
      archiveResult,
      stats,
      message,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      archiveResult: { archivedCount: 0, archivedArticleIds: [] },
      stats: {
        totalArticles: 0,
        activeArticles: 0,
        archivedArticles: 0,
        oldestActiveArticle: null,
        oldestArchivedArticle: null,
      },
      message: `Archive operation failed: ${errorMessage}`,
    };
  }
}
