import { queryOptions } from "@tanstack/react-query";
import { getWebhooksFn, getWebhookByIdFn } from "~/fn/webhooks";

export const getWebhooksQuery = () =>
  queryOptions({
    queryKey: ["webhooks"],
    queryFn: () => getWebhooksFn(),
  });

export const getWebhookByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["webhooks", id],
    queryFn: () => getWebhookByIdFn({ data: { id } }),
    enabled: !!id,
  });
