import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { sendTopicAlertsUseCase } from "~/use-cases/sendTopicAlertsUseCase";

export const Route = createFileRoute("/api/cron/send-alerts")({
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
          // Run the topic alerts job
          const result = await sendTopicAlertsUseCase();

          console.log("Topic alerts cron job completed:", result);

          return Response.json({
            success: true,
            ...result,
          });
        } catch (error) {
          console.error("Topic alerts cron job failed:", error);
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
