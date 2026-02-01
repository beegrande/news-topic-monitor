import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionId: text("subscription_id"),
  plan: text("plan").$default(() => "free").notNull(),
  subscriptionStatus: text("subscription_status"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  emailDigestFrequency: text("email_digest_frequency").$default(() => "none").notNull(),
  lastDigestSentAt: timestamp("last_digest_sent_at"),
  alertsEnabled: boolean("alerts_enabled").$default(() => true).notNull(),
  alertMethod: text("alert_method").$default(() => "email").notNull(),
  lastAlertSentAt: timestamp("last_alert_sent_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
});

export const song = pgTable("song", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  album: text("album"),
  genre: text("genre"),
  description: text("description"),
  audioKey: text("audio_key"),
  coverImageKey: text("cover_image_key"),
  status: text("status")
    .$default(() => "processing")
    .notNull(),
  duration: integer("duration"),
  playCount: integer("play_count")
    .$default(() => 0)
    .notNull(),
  downloadCount: integer("download_count")
    .$default(() => 0)
    .notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const heart = pgTable("heart", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  songId: text("song_id")
    .notNull()
    .references(() => song.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const playlist = pgTable("playlist", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public")
    .$default(() => false)
    .notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const playlistSong = pgTable("playlist_song", {
  id: text("id").primaryKey(),
  playlistId: text("playlist_id")
    .notNull()
    .references(() => playlist.id, { onDelete: "cascade" }),
  songId: text("song_id")
    .notNull()
    .references(() => song.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const songRelations = relations(song, ({ one, many }) => ({
  user: one(user, {
    fields: [song.userId],
    references: [user.id],
  }),
  hearts: many(heart),
  playlistSongs: many(playlistSong),
}));

export const heartRelations = relations(heart, ({ one }) => ({
  user: one(user, {
    fields: [heart.userId],
    references: [user.id],
  }),
  song: one(song, {
    fields: [heart.songId],
    references: [song.id],
  }),
}));

export const playlistRelations = relations(playlist, ({ one, many }) => ({
  user: one(user, {
    fields: [playlist.userId],
    references: [user.id],
  }),
  playlistSongs: many(playlistSong),
}));

export const playlistSongRelations = relations(playlistSong, ({ one }) => ({
  playlist: one(playlist, {
    fields: [playlistSong.playlistId],
    references: [playlist.id],
  }),
  song: one(song, {
    fields: [playlistSong.songId],
    references: [song.id],
  }),
}));

// Team collaboration tables (defined before topic to allow teamId reference)
export const team = pgTable("team", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const teamMember = pgTable("team_member", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text("role").$default(() => "member").notNull(),
  joinedAt: timestamp("joined_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const teamInvitation = pgTable("team_invitation", {
  id: text("id").primaryKey(),
  teamId: text("team_id")
    .notNull()
    .references(() => team.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").$default(() => "member").notNull(),
  invitedBy: text("invited_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").$default(() => "pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const topic = pgTable("topic", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  keywords: text("keywords").notNull(),
  monitoringFrequency: text("monitoring_frequency")
    .$default(() => "daily")
    .notNull(),
  status: text("status")
    .$default(() => "active")
    .notNull(),
  lastCheckedAt: timestamp("last_checked_at"),
  lastError: text("last_error"),
  lastErrorAt: timestamp("last_error_at"),
  includedSources: text("included_sources"),
  excludedSources: text("excluded_sources"),
  languages: text("languages").$default(() => "en"), // Comma-separated ISO 639-1 codes (e.g., "en,es,fr")
  notificationEnabled: boolean("notification_enabled")
    .$default(() => true)
    .notNull(),
  notificationFrequency: text("notification_frequency")
    .$default(() => "daily")
    .notNull(),
  minimumRelevanceScore: real("minimum_relevance_score")
    .$default(() => 0)
    .notNull(),
  isPublic: boolean("is_public")
    .$default(() => false)
    .notNull(),
  shareToken: text("share_token"),
  feedToken: text("feed_token"), // Private RSS feed authentication token
  parentId: text("parent_id"), // Self-referential: parent topic for hierarchy (e.g., "Technology" > "AI" > "Machine Learning")
  position: integer("position").$default(() => 0).notNull(), // Order among siblings
  // Schedule settings for monitoring windows
  scheduleEnabled: boolean("schedule_enabled").$default(() => false).notNull(), // Whether schedule constraints are active
  scheduleDays: text("schedule_days"), // Comma-separated days of week (0=Sun, 1=Mon, ..., 6=Sat), e.g., "1,2,3,4,5" for weekdays
  scheduleStartHour: integer("schedule_start_hour"), // Start hour in 24h format (0-23), e.g., 9 for 9 AM
  scheduleEndHour: integer("schedule_end_hour"), // End hour in 24h format (0-23), e.g., 17 for 5 PM
  scheduleTimezone: text("schedule_timezone").$default(() => "UTC"), // Timezone for schedule (e.g., "America/New_York")
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  teamId: text("team_id").references(() => team.id, { onDelete: "set null" }), // Optional team association
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const topicRelations = relations(topic, ({ one, many }) => ({
  user: one(user, {
    fields: [topic.userId],
    references: [user.id],
  }),
  team: one(team, {
    fields: [topic.teamId],
    references: [team.id],
  }),
  parent: one(topic, {
    fields: [topic.parentId],
    references: [topic.id],
    relationName: "topicHierarchy",
  }),
  children: many(topic, {
    relationName: "topicHierarchy",
  }),
  articleTopics: many(articleTopic),
}));

export const article = pgTable("article", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  summary: text("summary"),
  source: text("source").notNull(),
  url: text("url").notNull().unique(),
  publishedAt: timestamp("published_at"),
  sentiment: text("sentiment"),
  sentimentScore: real("sentiment_score"),
  contentHash: text("content_hash"),
  // Fact-checking fields
  factCheckStatus: text("fact_check_status"), // 'pending' | 'checked' | 'failed' | null
  credibilityScore: integer("credibility_score"), // 0-100 score, null if not checked
  factCheckSources: text("fact_check_sources"), // JSON string of fact-check claims
  factCheckedAt: timestamp("fact_checked_at"),
  // Geographic location fields
  country: text("country"), // ISO 3166-1 country name (e.g., "United States")
  countryCode: text("country_code"), // ISO 3166-1 alpha-2 code (e.g., "US")
  region: text("region"), // State/province/region (e.g., "California")
  city: text("city"), // City name
  latitude: real("latitude"), // Geographic coordinates
  longitude: real("longitude"),
  // Multi-language support fields
  language: text("language"), // ISO 639-1 language code (e.g., "en", "es", "fr")
  originalLanguage: text("original_language"), // Original language before translation
  translatedSummary: text("translated_summary"), // English translation of non-English summaries
  isArchived: boolean("is_archived").$default(() => false).notNull(),
  archivedAt: timestamp("archived_at"),
  fetchedAt: timestamp("fetched_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__*/ new Date())
    .notNull(),
});

export const articleTopic = pgTable("article_topic", {
  id: text("id").primaryKey(),
  articleId: text("article_id")
    .notNull()
    .references(() => article.id, { onDelete: "cascade" }),
  topicId: text("topic_id")
    .notNull()
    .references(() => topic.id, { onDelete: "cascade" }),
  relevanceScore: real("relevance_score").$default(() => 0.5),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const articleInteraction = pgTable("article_interaction", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  articleId: text("article_id")
    .notNull()
    .references(() => article.id, { onDelete: "cascade" }),
  topicId: text("topic_id")
    .notNull()
    .references(() => topic.id, { onDelete: "cascade" }),
  interactionType: text("interaction_type").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const articleRelations = relations(article, ({ many }) => ({
  articleTopics: many(articleTopic),
  interactions: many(articleInteraction),
}));

export const articleInteractionRelations = relations(articleInteraction, ({ one }) => ({
  user: one(user, {
    fields: [articleInteraction.userId],
    references: [user.id],
  }),
  article: one(article, {
    fields: [articleInteraction.articleId],
    references: [article.id],
  }),
  topic: one(topic, {
    fields: [articleInteraction.topicId],
    references: [topic.id],
  }),
}));

export const articleComment = pgTable("article_comment", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  articleId: text("article_id")
    .notNull()
    .references(() => article.id, { onDelete: "cascade" }),
  topicId: text("topic_id")
    .notNull()
    .references(() => topic.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const articleCommentRelations = relations(articleComment, ({ one }) => ({
  user: one(user, {
    fields: [articleComment.userId],
    references: [user.id],
  }),
  article: one(article, {
    fields: [articleComment.articleId],
    references: [article.id],
  }),
  topic: one(topic, {
    fields: [articleComment.topicId],
    references: [topic.id],
  }),
}));

export const articleTopicRelations = relations(articleTopic, ({ one }) => ({
  article: one(article, {
    fields: [articleTopic.articleId],
    references: [article.id],
  }),
  topic: one(topic, {
    fields: [articleTopic.topicId],
    references: [topic.id],
  }),
}));

export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topic.id, { onDelete: "cascade" }),
  articleId: text("article_id").references(() => article.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").$default(() => "new_article").notNull(),
  isRead: boolean("is_read").$default(() => false).notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
  topic: one(topic, {
    fields: [notification.topicId],
    references: [topic.id],
  }),
  article: one(article, {
    fields: [notification.articleId],
    references: [article.id],
  }),
}));

export const collection = pgTable("collection", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").$default(() => "#3B82F6"),
  feedToken: text("feed_token"), // Private RSS feed authentication token
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const collectionTopic = pgTable("collection_topic", {
  id: text("id").primaryKey(),
  collectionId: text("collection_id")
    .notNull()
    .references(() => collection.id, { onDelete: "cascade" }),
  topicId: text("topic_id")
    .notNull()
    .references(() => topic.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const collectionRelations = relations(collection, ({ one, many }) => ({
  user: one(user, {
    fields: [collection.userId],
    references: [user.id],
  }),
  collectionTopics: many(collectionTopic),
}));

export const collectionTopicRelations = relations(collectionTopic, ({ one }) => ({
  collection: one(collection, {
    fields: [collectionTopic.collectionId],
    references: [collection.id],
  }),
  topic: one(topic, {
    fields: [collectionTopic.topicId],
    references: [topic.id],
  }),
}));

export const userRelations = relations(user, ({ many }) => ({
  songs: many(song),
  hearts: many(heart),
  playlists: many(playlist),
  topics: many(topic),
  notifications: many(notification),
  collections: many(collection),
  teamMemberships: many(teamMember),
  createdTeams: many(team),
}));

export const teamRelations = relations(team, ({ one, many }) => ({
  creator: one(user, {
    fields: [team.createdBy],
    references: [user.id],
  }),
  members: many(teamMember),
  invitations: many(teamInvitation),
  topics: many(topic),
}));

export const teamMemberRelations = relations(teamMember, ({ one }) => ({
  team: one(team, {
    fields: [teamMember.teamId],
    references: [team.id],
  }),
  user: one(user, {
    fields: [teamMember.userId],
    references: [user.id],
  }),
}));

export const teamInvitationRelations = relations(teamInvitation, ({ one }) => ({
  team: one(team, {
    fields: [teamInvitation.teamId],
    references: [team.id],
  }),
  inviter: one(user, {
    fields: [teamInvitation.invitedBy],
    references: [user.id],
  }),
}));

export type Song = typeof song.$inferSelect;
export type CreateSongData = typeof song.$inferInsert;
export type UpdateSongData = Partial<
  Omit<CreateSongData, "id" | "createdAt">
>;

export type User = typeof user.$inferSelect;
export type Heart = typeof heart.$inferSelect;
export type CreateHeartData = typeof heart.$inferInsert;

export type Playlist = typeof playlist.$inferSelect;
export type CreatePlaylistData = typeof playlist.$inferInsert;
export type UpdatePlaylistData = Partial<
  Omit<CreatePlaylistData, "id" | "createdAt">
>;

export type PlaylistSong = typeof playlistSong.$inferSelect;
export type CreatePlaylistSongData = typeof playlistSong.$inferInsert;

export type Topic = typeof topic.$inferSelect;
export type CreateTopicData = typeof topic.$inferInsert;
export type UpdateTopicData = Partial<
  Omit<CreateTopicData, "id" | "createdAt">
>;

export type Article = typeof article.$inferSelect;
export type CreateArticleData = typeof article.$inferInsert;
export type UpdateArticleData = Partial<
  Omit<CreateArticleData, "id" | "createdAt">
>;

export type ArticleTopic = typeof articleTopic.$inferSelect;
export type CreateArticleTopicData = typeof articleTopic.$inferInsert;

export type ArticleInteraction = typeof articleInteraction.$inferSelect;
export type CreateArticleInteractionData = typeof articleInteraction.$inferInsert;

export type InteractionType = "click" | "helpful" | "not_helpful";

export type MonitoringFrequency = "hourly" | "daily" | "weekly";
export type TopicStatus = "active" | "paused" | "archived";
export type NotificationFrequency = "daily" | "weekly" | "none";

export type SubscriptionPlan = "free" | "basic" | "pro";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "unpaid" | "incomplete";

export type ArticleSentiment = "positive" | "negative" | "neutral";

export type FactCheckStatus = "pending" | "checked" | "failed";

export type EmailDigestFrequency = "daily" | "weekly" | "none";

export type AlertMethod = "email" | "in_app" | "both";

export type NotificationType = "new_article" | "digest" | "system";

export type Notification = typeof notification.$inferSelect;
export type CreateNotificationData = typeof notification.$inferInsert;

export type Collection = typeof collection.$inferSelect;
export type CreateCollectionData = typeof collection.$inferInsert;
export type UpdateCollectionData = Partial<
  Omit<CreateCollectionData, "id" | "createdAt">
>;

export type CollectionTopic = typeof collectionTopic.$inferSelect;
export type CreateCollectionTopicData = typeof collectionTopic.$inferInsert;

export type Team = typeof team.$inferSelect;
export type CreateTeamData = typeof team.$inferInsert;
export type UpdateTeamData = Partial<Omit<CreateTeamData, "id" | "createdAt">>;

export type TeamMember = typeof teamMember.$inferSelect;
export type CreateTeamMemberData = typeof teamMember.$inferInsert;

export type TeamInvitation = typeof teamInvitation.$inferSelect;
export type CreateTeamInvitationData = typeof teamInvitation.$inferInsert;

export type TeamRole = "owner" | "admin" | "member";
export type InvitationStatus = "pending" | "accepted" | "declined";

// Topic sharing/collaborator tables
export const topicCollaborator = pgTable("topic_collaborator", {
  id: text("id").primaryKey(),
  topicId: text("topic_id")
    .notNull()
    .references(() => topic.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  permission: text("permission").$default(() => "view").notNull(), // 'view' | 'edit'
  addedAt: timestamp("added_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const topicCollaboratorRelations = relations(topicCollaborator, ({ one }) => ({
  topic: one(topic, {
    fields: [topicCollaborator.topicId],
    references: [topic.id],
  }),
  user: one(user, {
    fields: [topicCollaborator.userId],
    references: [user.id],
  }),
}));

export type TopicCollaborator = typeof topicCollaborator.$inferSelect;
export type CreateTopicCollaboratorData = typeof topicCollaborator.$inferInsert;
export type CollaboratorPermission = "view" | "edit";

export type ArticleComment = typeof articleComment.$inferSelect;
export type CreateArticleCommentData = typeof articleComment.$inferInsert;
export type UpdateArticleCommentData = Partial<
  Omit<CreateArticleCommentData, "id" | "createdAt" | "userId" | "articleId" | "topicId">
>;

// Saved searches table for storing complex article search queries
export const savedSearch = pgTable("saved_search", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  query: text("query").notNull(), // The search query text
  topicIds: text("topic_ids"), // JSON array of topic IDs to filter by
  source: text("source"), // Source filter
  dateRangeType: text("date_range_type"), // 'custom', 'last7days', 'last30days', 'last90days', or null for any
  dateFrom: timestamp("date_from"), // Custom date range start
  dateTo: timestamp("date_to"), // Custom date range end
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const savedSearchRelations = relations(savedSearch, ({ one }) => ({
  user: one(user, {
    fields: [savedSearch.userId],
    references: [user.id],
  }),
}));

export type SavedSearch = typeof savedSearch.$inferSelect;
export type CreateSavedSearchData = typeof savedSearch.$inferInsert;
export type UpdateSavedSearchData = Partial<
  Omit<CreateSavedSearchData, "id" | "createdAt" | "userId">
>;

// Source credibility scoring tables
export const sourceCredibility = pgTable("source_credibility", {
  id: text("id").primaryKey(),
  sourceName: text("source_name").notNull().unique(),
  credibilityScore: integer("credibility_score"), // 0-100 score
  accuracyRating: real("accuracy_rating"), // 0-1.0 based on fact-check correlations
  transparencyRating: real("transparency_rating"), // 0-1.0 based on source practices
  biasRating: real("bias_rating"), // -1.0 (far left) to 1.0 (far right), 0 = neutral
  userFeedbackScore: real("user_feedback_score"), // 0-5.0 average user rating
  userFeedbackCount: integer("user_feedback_count").$default(() => 0).notNull(),
  articleCount: integer("article_count").$default(() => 0).notNull(), // Number of articles from this source
  lastCalculatedAt: timestamp("last_calculated_at"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sourceFeedback = pgTable("source_feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sourceCredibilityId: text("source_credibility_id")
    .notNull()
    .references(() => sourceCredibility.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 scale
  feedback: text("feedback"), // Optional written feedback
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const sourceCredibilityRelations = relations(sourceCredibility, ({ many }) => ({
  feedbacks: many(sourceFeedback),
}));

export const sourceFeedbackRelations = relations(sourceFeedback, ({ one }) => ({
  user: one(user, {
    fields: [sourceFeedback.userId],
    references: [user.id],
  }),
  sourceCredibility: one(sourceCredibility, {
    fields: [sourceFeedback.sourceCredibilityId],
    references: [sourceCredibility.id],
  }),
}));

export type SourceCredibility = typeof sourceCredibility.$inferSelect;
export type CreateSourceCredibilityData = typeof sourceCredibility.$inferInsert;
export type UpdateSourceCredibilityData = Partial<
  Omit<CreateSourceCredibilityData, "id" | "createdAt">
>;

export type SourceFeedback = typeof sourceFeedback.$inferSelect;
export type CreateSourceFeedbackData = typeof sourceFeedback.$inferInsert;
export type UpdateSourceFeedbackData = Partial<
  Omit<CreateSourceFeedbackData, "id" | "createdAt" | "userId" | "sourceCredibilityId">
>;

// Webhook configuration table for external integrations
export const webhook = pgTable("webhook", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  topicId: text("topic_id").references(() => topic.id, { onDelete: "cascade" }), // null means all topics
  name: text("name").notNull(),
  url: text("url").notNull(),
  secret: text("secret"), // Optional HMAC secret for signing payloads
  isEnabled: boolean("is_enabled").$default(() => true).notNull(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const webhookRelations = relations(webhook, ({ one }) => ({
  user: one(user, {
    fields: [webhook.userId],
    references: [user.id],
  }),
  topic: one(topic, {
    fields: [webhook.topicId],
    references: [topic.id],
  }),
}));

export type Webhook = typeof webhook.$inferSelect;
export type CreateWebhookData = typeof webhook.$inferInsert;
export type UpdateWebhookData = Partial<
  Omit<CreateWebhookData, "id" | "createdAt" | "userId">
>;
