import { queryOptions } from "@tanstack/react-query";
import {
  getSavedSearchesFn,
  getSavedSearchByIdFn,
} from "~/fn/saved-searches";

export const getSavedSearchesQuery = () =>
  queryOptions({
    queryKey: ["user-saved-searches"],
    queryFn: () => getSavedSearchesFn(),
  });

export const getSavedSearchByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["saved-search", id],
    queryFn: () => getSavedSearchByIdFn({ data: { id } }),
  });
