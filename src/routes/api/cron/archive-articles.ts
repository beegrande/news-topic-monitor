import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { archiveOldArticlesUseCase } from "~/use-cases/archiveOldArticlesUseCase";

export const Route = createFileRoute("/api/cron/archive-articles")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Verify authorization
        const authHeader = request.headers.get("authorization");
        const expectedToken = `Bearer ${privateEnv.CRON_SECRET}`;

        if (authHeader !== expectedToken) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        }

        try {
          // Get days parameter from query string (default 30)
          const url = new URL(request.url);
          const daysParam = url.searchParams.get("days");
          const days = daysParam ? parseInt(daysParam, 10) : 30;

          if (isNaN(days) || days < 1) {
            return Response.json(
              { error: "Invalid days parameter. Must be a positive integer." },
              { status: 400 }
            );
          }

          // Run the archive use case
          const result = await archiveOldArticlesUseCase(days);
          console.log("Article archive completed:", result);

          return Response.json({
            success: result.success,
            message: result.message,
            archived: result.archiveResult.archivedCount,
            stats: {
              totalArticles: result.stats.totalArticles,
              activeArticles: result.stats.activeArticles,
              archivedArticles: result.stats.archivedArticles,
            },
          });
        } catch (error) {
          console.error("Archive cron job failed:", error);
          return Response.json(
            {
              error: "Archive cron job failed",
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
