import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { fetchArticleContentUseCase } from "~/use-cases/fetchArticleContentUseCase";

export const Route = createFileRoute("/api/cron/fetch-article-content")({
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
          // Get limit parameter from query string (default 50)
          const url = new URL(request.url);
          const limitParam = url.searchParams.get("limit");
          const limit = limitParam ? parseInt(limitParam, 10) : 50;

          if (isNaN(limit) || limit < 1 || limit > 200) {
            return Response.json(
              { error: "Invalid limit parameter. Must be between 1 and 200." },
              { status: 400 }
            );
          }

          // Run the fetch content use case
          const result = await fetchArticleContentUseCase(limit);
          console.log("Article content fetch completed:", {
            processed: result.processed,
            successful: result.successful,
            failed: result.failed,
          });

          return Response.json({
            success: true,
            processed: result.processed,
            successful: result.successful,
            failed: result.failed,
            // Only include first 10 errors to avoid large response
            errors: result.errors.slice(0, 10),
          });
        } catch (error) {
          console.error("Fetch article content cron job failed:", error);
          return Response.json(
            {
              error: "Fetch article content cron job failed",
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
