import { eq, desc, sql, and } from "drizzle-orm";
import { database } from "~/db";
import {
  savedSearch,
  type SavedSearch,
  type CreateSavedSearchData,
  type UpdateSavedSearchData,
} from "~/db/schema";

export async function findSavedSearchById(id: string): Promise<SavedSearch | null> {
  const [result] = await database
    .select()
    .from(savedSearch)
    .where(eq(savedSearch.id, id))
    .limit(1);

  return result || null;
}

export async function createSavedSearch(data: CreateSavedSearchData): Promise<SavedSearch> {
  const [newSavedSearch] = await database
    .insert(savedSearch)
    .values({
      ...data,
      updatedAt: new Date(),
    })
    .returning();

  return newSavedSearch;
}

export async function updateSavedSearch(
  id: string,
  data: UpdateSavedSearchData
): Promise<SavedSearch | null> {
  const [updatedSavedSearch] = await database
    .update(savedSearch)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(savedSearch.id, id))
    .returning();

  return updatedSavedSearch || null;
}

export async function deleteSavedSearch(id: string): Promise<boolean> {
  const result = await database
    .delete(savedSearch)
    .where(eq(savedSearch.id, id))
    .returning();

  return result.length > 0;
}

export async function findSavedSearchesByUserId(userId: string): Promise<SavedSearch[]> {
  return await database
    .select()
    .from(savedSearch)
    .where(eq(savedSearch.userId, userId))
    .orderBy(desc(savedSearch.createdAt));
}

export async function countSavedSearchesByUserId(userId: string): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(savedSearch)
    .where(eq(savedSearch.userId, userId));

  return result?.count || 0;
}

export async function checkSavedSearchOwnership(
  savedSearchId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: savedSearch.id })
    .from(savedSearch)
    .where(and(eq(savedSearch.id, savedSearchId), eq(savedSearch.userId, userId)))
    .limit(1);

  return !!result;
}
