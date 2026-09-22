import logging
from typing import List, Dict, Any, Set
import psycopg2
from psycopg2.extras import RealDictCursor
from scraper.src.config.settings import DATABASE_URL

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, db_url: str = DATABASE_URL):
        self.db_url = db_url

    def get_connection(self):
        return psycopg2.connect(self.db_url)

    def get_existing_urls_and_hashes(self) -> tuple[Set[str], Set[str]]:
        """Fetch all existing URLs and content hashes to ensure O(1) duplicate checks."""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT url, content_hash FROM articles")
                rows = cur.fetchall()
                urls = {row[0] for row in rows if row[0]}
                hashes = {row[1] for row in rows if row[1]}
                return urls, hashes

    def get_all_articles_for_clustering(self) -> List[Dict[str, Any]]:
        """Fetch articles from database to rebuild/update clustering assignments."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT id, source, title, summary, content, url, author, published_at, content_hash, cluster_id
                    FROM articles
                    ORDER BY published_at DESC
                """)
                return cur.fetchall()

    def insert_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Inserts new normalized articles into PostgreSQL.
        Uses ON CONFLICT (url) DO NOTHING to guarantee idempotency.
        Returns the inserted articles with their generated IDs.
        """
        if not articles:
            return []

        inserted = []
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                insert_sql = """
                    INSERT INTO articles (
                        source, title, summary, content, url, author, published_at, fetched_at,
                        content_hash, extraction_status, created_at, updated_at
                    ) VALUES (
                        %(source)s, %(title)s, %(summary)s, %(content)s, %(url)s, %(author)s,
                        %(published_at)s, NOW(), %(content_hash)s, %(extraction_status)s, NOW(), NOW()
                    )
                    ON CONFLICT (url) DO NOTHING
                    RETURNING id, source, title, summary, content, url, author, published_at, content_hash, cluster_id
                """
                for art in articles:
                    try:
                        cur.execute(insert_sql, art)
                        row = cur.fetchone()
                        if row:
                            inserted.append(dict(row))
                    except Exception as e:
                        logger.error(f"Error inserting article {art.get('url')}: {e}")
                        conn.rollback()
                        continue
                conn.commit()

        return inserted

    def update_clusters_and_assignments(self, clusters_data: List[Dict[str, Any]]):
        """
        Persists newly computed clusters and links articles to their clusters.
        Replaces stale cluster assignments with fresh groups.
        """
        if not clusters_data:
            return

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # We can update or recreate clusters
                # Reset previous cluster IDs on articles to prevent orphan references
                cur.execute("UPDATE articles SET cluster_id = NULL")
                cur.execute("DELETE FROM clusters")

                insert_cluster_sql = """
                    INSERT INTO clusters (
                        label, article_count, earliest_article_time, latest_article_time,
                        keywords, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, NOW(), NOW()
                    ) RETURNING id
                """

                update_article_cluster_sql = """
                    UPDATE articles SET cluster_id = %s, updated_at = NOW() WHERE id = %s
                """

                for c in clusters_data:
                    cur.execute(insert_cluster_sql, (
                        c["label"],
                        c["article_count"],
                        c["earliest_time"],
                        c["latest_time"],
                        c.get("keywords", "")
                    ))
                    cluster_id = cur.fetchone()[0]

                    for art in c["articles"]:
                        art_id = art.get("id")
                        if art_id:
                            cur.execute(update_article_cluster_sql, (cluster_id, art_id))

                conn.commit()

    def update_job_status(self, job_id: str, status: str, progress: int = 0,
                          articles_processed: int = 0, articles_created: int = 0,
                          clusters_updated: int = 0, error_message: str = None, details: str = None):
        """Record or update ingestion job status for async job tracking."""
        if not job_id:
            return

        with self.get_connection() as conn:
            with conn.cursor() as cur:
                upsert_sql = """
                    INSERT INTO ingestion_jobs (
                        id, status, started_at, completed_at, error_message,
                        articles_processed, articles_created, clusters_updated, progress, details
                    ) VALUES (
                        %s, %s, NOW(), NULL, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        status = EXCLUDED.status,
                        completed_at = CASE WHEN EXCLUDED.status IN ('completed', 'failed') THEN NOW() ELSE ingestion_jobs.completed_at END,
                        error_message = EXCLUDED.error_message,
                        articles_processed = EXCLUDED.articles_processed,
                        articles_created = EXCLUDED.articles_created,
                        clusters_updated = EXCLUDED.clusters_updated,
                        progress = EXCLUDED.progress,
                        details = EXCLUDED.details
                """
                cur.execute(upsert_sql, (
                    job_id, status, error_message,
                    articles_processed, articles_created,
                    clusters_updated, progress, details
                ))
                conn.commit()
