import { queryOptions } from "@tanstack/react-query";
import { getApiKeyStatusFn } from "~/fn/api-keys";

export const getApiKeyStatusQuery = () =>
  queryOptions({
    queryKey: ["api-keys", "status"],
    queryFn: () => getApiKeyStatusFn(),
  });
