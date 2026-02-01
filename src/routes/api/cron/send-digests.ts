import { createFileRoute } from "@tanstack/react-router";
import { privateEnv } from "~/config/privateEnv";
import { sendEmailDigestsUseCase } from "~/use-cases/sendEmailDigestsUseCase";

export const Route = createFileRoute("/api/cron/send-digests")({
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
          // Run the email digest job
          const result = await sendEmailDigestsUseCase();

          console.log("Email digest cron job completed:", result);

          return Response.json({
            success: true,
            ...result,
          });
        } catch (error) {
          console.error("Email digest cron job failed:", error);
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
