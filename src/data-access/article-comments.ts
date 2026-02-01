import { eq, and, desc, sql } from "drizzle-orm";
import { database } from "~/db";
import {
  articleComment,
  user,
  type ArticleComment,
  type CreateArticleCommentData,
  type UpdateArticleCommentData,
} from "~/db/schema";

export interface ArticleCommentWithUser extends ArticleComment {
  userName: string;
  userImage: string | null;
}

export async function createComment(
  data: CreateArticleCommentData
): Promise<ArticleComment> {
  const [comment] = await database
    .insert(articleComment)
    .values(data)
    .returning();

  return comment;
}

export async function findCommentById(
  id: string
): Promise<ArticleComment | null> {
  const [result] = await database
    .select()
    .from(articleComment)
    .where(eq(articleComment.id, id))
    .limit(1);

  return result || null;
}

export async function findCommentsByArticleId(
  articleId: string,
  topicId: string,
  userId: string,
  limit: number = 50
): Promise<ArticleCommentWithUser[]> {
  const results = await database
    .select({
      id: articleComment.id,
      userId: articleComment.userId,
      articleId: articleComment.articleId,
      topicId: articleComment.topicId,
      content: articleComment.content,
      createdAt: articleComment.createdAt,
      updatedAt: articleComment.updatedAt,
      userName: user.name,
      userImage: user.image,
    })
    .from(articleComment)
    .innerJoin(user, eq(articleComment.userId, user.id))
    .where(
      and(
        eq(articleComment.articleId, articleId),
        eq(articleComment.topicId, topicId),
        eq(articleComment.userId, userId)
      )
    )
    .orderBy(desc(articleComment.createdAt))
    .limit(limit);

  return results;
}

export async function findCommentsByUserId(
  userId: string,
  limit: number = 50
): Promise<ArticleComment[]> {
  return await database
    .select()
    .from(articleComment)
    .where(eq(articleComment.userId, userId))
    .orderBy(desc(articleComment.createdAt))
    .limit(limit);
}

export async function updateComment(
  id: string,
  data: UpdateArticleCommentData
): Promise<ArticleComment | null> {
  const [result] = await database
    .update(articleComment)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(articleComment.id, id))
    .returning();

  return result || null;
}

export async function deleteComment(id: string): Promise<boolean> {
  const result = await database
    .delete(articleComment)
    .where(eq(articleComment.id, id))
    .returning();

  return result.length > 0;
}

export async function countCommentsByArticle(
  articleId: string,
  topicId: string,
  userId: string
): Promise<number> {
  const [result] = await database
    .select({ count: sql<number>`count(*)` })
    .from(articleComment)
    .where(
      and(
        eq(articleComment.articleId, articleId),
        eq(articleComment.topicId, topicId),
        eq(articleComment.userId, userId)
      )
    );

  return Number(result?.count || 0);
}

export async function isCommentOwner(
  commentId: string,
  userId: string
): Promise<boolean> {
  const [result] = await database
    .select({ id: articleComment.id })
    .from(articleComment)
    .where(
      and(
        eq(articleComment.id, commentId),
        eq(articleComment.userId, userId)
      )
    )
    .limit(1);

  return !!result;
}
