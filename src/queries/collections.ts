import { queryOptions } from "@tanstack/react-query";
import {
  getCollectionsFn,
  getCollectionByIdFn,
} from "~/fn/collections";

export const getCollectionsQuery = () =>
  queryOptions({
    queryKey: ["user-collections"],
    queryFn: () => getCollectionsFn(),
  });

export const getCollectionByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["collection", id],
    queryFn: () => getCollectionByIdFn({ data: { id } }),
  });
