import { queryOptions } from "@tanstack/react-query";
import {
  getNotificationsFn,
  getUnreadCountFn,
  getAlertSettingsFn,
} from "~/fn/notifications";

export const getNotificationsQuery = () =>
  queryOptions({
    queryKey: ["notifications"],
    queryFn: () => getNotificationsFn(),
  });

export const getUnreadCountQuery = () =>
  queryOptions({
    queryKey: ["notifications-unread-count"],
    queryFn: () => getUnreadCountFn(),
    refetchInterval: 60000, // Refetch every minute
  });

export const getAlertSettingsQuery = () =>
  queryOptions({
    queryKey: ["alert-settings"],
    queryFn: () => getAlertSettingsFn(),
  });
