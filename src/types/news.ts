export interface ClusterSummary {
  id: number;
  label: string;
  articleCount: number;
  startTime: string;
  endTime: string;
  keywords?: string | null;
  sources?: string[];
}

export interface ArticleItem {
  id: number;
  source: string;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  author: string | null;
  publishedAt: string;
  extractionStatus: string | null;
}

export interface ClusterDetail {
  id: number;
  label: string;
  articleCount: number;
  keywords?: string | null;
  earliestArticleTime: string;
  latestArticleTime: string;
  createdAt: string;
  updatedAt: string;
  articles: ArticleItem[];
}

export interface TimelineItem {
  id: number;
  label: string;
  startTime: string;
  endTime: string;
  articleCount: number;
  intensity: number;
  keywords?: string | null;
  sources: string[];
}

export interface IngestionJobStatus {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  startedAt: string;
  completedAt?: string | null;
  articlesProcessed: number;
  articlesCreated: number;
  clustersUpdated: number;
  errorMessage?: string | null;
  details?: {
    feeds_processed?: number;
    rss_items_found?: number;
    new_articles?: number;
    duplicates_skipped?: number;
    content_extraction_failures?: number;
    total_articles_corpus?: number;
    clusters_created?: number;
    duration_seconds?: number;
  } | null;
}

export interface DashboardStats {
  totalArticles: number;
  totalClusters: number;
  sources: string[];
  lastUpdated: string | null;
}
