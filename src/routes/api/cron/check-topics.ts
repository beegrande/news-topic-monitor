import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { checkTopicUpdatesUseCase } from "~/use-cases/checkTopicUpdatesUseCase";
import { sendTopicAlertsUseCase } from "~/use-cases/sendTopicAlertsUseCase";

export const Route = createFileRoute("/api/cron/check-topics")({
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
          // Run the topic update check with 24 hour max interval
          const topicResult = await checkTopicUpdatesUseCase(24);
          console.log("Topic check completed:", topicResult);

          // Send alerts for new articles
          const alertResult = await sendTopicAlertsUseCase();
          console.log("Topic alerts sent:", alertResult);

          return Response.json({
            success: true,
            topics: topicResult,
            alerts: alertResult,
          });
        } catch (error) {
          console.error("Cron job failed:", error);
          return Response.json(
            {
              error: "Cron job failed",
              message: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
          );
        }
      },
    },
  },
});
