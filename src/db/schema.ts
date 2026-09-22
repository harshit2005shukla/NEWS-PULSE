import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";

export const clusters = pgTable(
  "clusters",
  {
    id: serial("id").primaryKey(),
    label: text("label").notNull(),
    articleCount: integer("article_count").default(0).notNull(),
    earliestArticleTime: timestamp("earliest_article_time", { withTimezone: true }),
    latestArticleTime: timestamp("latest_article_time", { withTimezone: true }),
    keywords: text("keywords"), // comma separated key terms
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_clusters_article_count").on(table.articleCount),
    index("idx_clusters_latest_time").on(table.latestArticleTime),
  ]
);

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    source: text("source").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    content: text("content"),
    url: text("url").notNull().unique(),
    author: text("author"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
    contentHash: text("content_hash").notNull(),
    clusterId: integer("cluster_id").references(() => clusters.id, { onDelete: "set null" }),
    extractionStatus: text("extraction_status").default("pending"), // 'extracted', 'fallback', 'failed'
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_articles_url").on(table.url),
    index("idx_articles_content_hash").on(table.contentHash),
    index("idx_articles_published_at").on(table.publishedAt),
    index("idx_articles_source").on(table.source),
    index("idx_articles_cluster_id").on(table.clusterId),
  ]
);

export const ingestionJobs = pgTable(
  "ingestion_jobs",
  {
    id: text("id").primaryKey(),
    status: text("status").notNull(), // 'queued', 'running', 'completed', 'failed'
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    articlesProcessed: integer("articles_processed").default(0),
    articlesCreated: integer("articles_created").default(0),
    clustersUpdated: integer("clusters_updated").default(0),
    progress: integer("progress").default(0),
    details: text("details"), // JSON string of logs or stats
  },
  (table) => [
    index("idx_ingestion_jobs_status").on(table.status),
    index("idx_ingestion_jobs_started_at").on(table.startedAt),
  ]
);

export type Cluster = typeof clusters.$inferSelect;
export type NewCluster = typeof clusters.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type IngestionJob = typeof ingestionJobs.$inferSelect;
export type NewIngestionJob = typeof ingestionJobs.$inferInsert;
