import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  getUserDigestSettings,
  updateUserDigestFrequency,
} from "~/data-access/email-digest";

export const getEmailPreferencesFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const settings = await getUserDigestSettings(context.userId);
    if (!settings) {
      return {
        emailDigestFrequency: "none" as const,
        lastDigestSentAt: null,
      };
    }
    return settings;
  });

export const updateEmailPreferencesFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      emailDigestFrequency: z.enum(["daily", "weekly", "none"]),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const updatedUser = await updateUserDigestFrequency(
      context.userId,
      data.emailDigestFrequency
    );

    if (!updatedUser) {
      throw new Error("Failed to update email preferences");
    }

    return {
      emailDigestFrequency: updatedUser.emailDigestFrequency,
      lastDigestSentAt: updatedUser.lastDigestSentAt,
    };
  });
