import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  markNotificationReadFn,
  markAllNotificationsReadFn,
  deleteNotificationFn,
  deleteAllNotificationsFn,
  updateAlertSettingsFn,
} from "~/fn/notifications";
import {
  getNotificationsQuery,
  getUnreadCountQuery,
  getAlertSettingsQuery,
} from "~/queries/notifications";
import { getErrorMessage } from "~/utils/error";
import { authClient } from "~/lib/auth-client";

// Query hooks
export function useNotifications(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getNotificationsQuery(),
    enabled: enabled && !!session?.user,
  });
}

export function useUnreadNotificationCount(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getUnreadCountQuery(),
    enabled: enabled && !!session?.user,
  });
}

export function useAlertSettings(enabled = true) {
  const { data: session } = authClient.useSession();

  return useQuery({
    ...getAlertSettingsQuery(),
    enabled: enabled && !!session?.user,
  });
}

// Mutation hooks
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      markNotificationReadFn({ data: { notificationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error) => {
      toast.error("Failed to mark notification as read", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsReadFn(),
    onSuccess: () => {
      toast.success("All notifications marked as read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error) => {
      toast.error("Failed to mark notifications as read", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      deleteNotificationFn({ data: { notificationId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error) => {
      toast.error("Failed to delete notification", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useDeleteAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllNotificationsFn(),
    onSuccess: () => {
      toast.success("All notifications deleted");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
    onError: (error) => {
      toast.error("Failed to delete notifications", {
        description: getErrorMessage(error),
      });
    },
  });
}

export function useUpdateAlertSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { alertsEnabled?: boolean; alertMethod?: "email" | "in_app" | "both" }) =>
      updateAlertSettingsFn({ data }),
    onSuccess: () => {
      toast.success("Alert settings updated");
      queryClient.invalidateQueries({ queryKey: ["alert-settings"] });
    },
    onError: (error) => {
      toast.error("Failed to update alert settings", {
        description: getErrorMessage(error),
      });
    },
  });
}
