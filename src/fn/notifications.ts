import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authenticatedMiddleware } from "./middleware";
import {
  findNotificationsByUserId,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUserAlertSettings,
  updateUserAlertSettings,
} from "~/data-access/notifications";

export const getNotificationsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await findNotificationsByUserId(context.userId);
  });

export const getUnreadCountFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    return await countUnreadNotifications(context.userId);
  });

export const markNotificationReadFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ notificationId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const notification = await markNotificationAsRead(
      data.notificationId,
      context.userId
    );

    if (!notification) {
      throw new Error("Notification not found");
    }

    return notification;
  });

export const markAllNotificationsReadFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const count = await markAllNotificationsAsRead(context.userId);
    return { markedAsRead: count };
  });

export const deleteNotificationFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({ notificationId: z.string() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const deleted = await deleteNotification(data.notificationId, context.userId);

    if (!deleted) {
      throw new Error("Notification not found");
    }

    return { success: true };
  });

export const deleteAllNotificationsFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const count = await deleteAllNotifications(context.userId);
    return { deleted: count };
  });

export const getAlertSettingsFn = createServerFn()
  .middleware([authenticatedMiddleware])
  .handler(async ({ context }) => {
    const settings = await getUserAlertSettings(context.userId);
    if (!settings) {
      return {
        alertsEnabled: true,
        alertMethod: "email" as const,
        lastAlertSentAt: null,
      };
    }
    return settings;
  });

export const updateAlertSettingsFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      alertsEnabled: z.boolean().optional(),
      alertMethod: z.enum(["email", "in_app", "both"]).optional(),
    })
  )
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context }) => {
    const updated = await updateUserAlertSettings(context.userId, data);

    if (!updated) {
      throw new Error("Failed to update alert settings");
    }

    return {
      alertsEnabled: updated.alertsEnabled,
      alertMethod: updated.alertMethod,
      lastAlertSentAt: updated.lastAlertSentAt,
    };
  });
