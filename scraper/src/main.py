import sys
import os
import argparse
import logging
import json
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from scraper.src.config.settings import DEFAULT_FEEDS
from scraper.src.feeds.ingester import FeedIngester
from scraper.src.extraction.extractor import ArticleExtractor
from scraper.src.clustering.clusterer import TopicClusterer
from scraper.src.database.db_manager import DatabaseManager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("NewsPulseScraper")

def run_pipeline(job_id: str = None) -> dict:
    start_time = datetime.now(timezone.utc)
    logger.info("==========================================")
    logger.info("   NEWS PULSE RSS INGESTION PIPELINE     ")
    logger.info("==========================================")

    db = DatabaseManager()

    if job_id:
        db.update_job_status(job_id, status="running", progress=10)

    # 1. Fetch RSS feeds
    logger.info("Step 1: Ingesting articles from configured RSS sources...")
    ingester = FeedIngester(DEFAULT_FEEDS)
    raw_articles = ingester.fetch_all()
    total_found = len(raw_articles)
    logger.info(f"Retrieved {total_found} candidate articles across {len(DEFAULT_FEEDS)} feeds")

    if job_id:
        db.update_job_status(job_id, status="running", progress=30, articles_processed=total_found)

    # 2. Duplicate Detection
    logger.info("Step 2: Performing URL and Content Hash deduplication against database...")
    existing_urls, existing_hashes = db.get_existing_urls_and_hashes()

    unique_new_articles = []
    duplicates_skipped = 0

    seen_this_run_urls = set()
    for art in raw_articles:
        url = art["url"]
        chash = art["content_hash"]
        if url in existing_urls or chash in existing_hashes or url in seen_this_run_urls:
            duplicates_skipped += 1
            continue
        seen_this_run_urls.add(url)
        unique_new_articles.append(art)

    logger.info(f"Duplicate check complete: {len(unique_new_articles)} new, {duplicates_skipped} duplicates skipped")

    if job_id:
        db.update_job_status(job_id, status="running", progress=50, articles_processed=total_found)

    # 3. Content Extraction for new articles
    logger.info("Step 3: Extracting full article text for new articles...")
    extractor = ArticleExtractor()
    extraction_failures = 0
    extraction_successes = 0

    for idx, art in enumerate(unique_new_articles):
        # Update progress incrementally
        res = extractor.extract(art["url"])
        art["content"] = res["content"]
        art["extraction_status"] = res["status"]
        if res["status"] == "extracted":
            extraction_successes += 1
        elif res["status"] == "failed":
            extraction_failures += 1
        else:
            extraction_successes += 1 # fallback summary still valid

    logger.info(f"Content extraction finished: {extraction_successes} succeeded, {extraction_failures} failed/fallback")

    if job_id:
        db.update_job_status(job_id, status="running", progress=70, articles_created=len(unique_new_articles))

    # 4. Insert new articles
    logger.info("Step 4: Persisting new articles to database...")
    inserted_articles = db.insert_articles(unique_new_articles)
    logger.info(f"Saved {len(inserted_articles)} new article records")

    # 5. Topic Clustering across all current articles
    logger.info("Step 5: Running Topic Clustering across active news corpus...")
    all_articles = db.get_all_articles_for_clustering()
    clusterer = TopicClusterer()
    clusters = clusterer.cluster_articles(all_articles)
    logger.info(f"Topic clustering produced {len(clusters)} topic clusters from {len(all_articles)} total articles")

    # 6. Update cluster tables and assign article references
    logger.info("Step 6: Updating cluster records and foreign key relationships...")
    db.update_clusters_and_assignments(clusters)

    duration = (datetime.now(timezone.utc) - start_time).total_seconds()

    stats = {
        "feeds_processed": len(DEFAULT_FEEDS),
        "rss_items_found": total_found,
        "new_articles": len(unique_new_articles),
        "duplicates_skipped": duplicates_skipped,
        "content_extraction_failures": extraction_failures,
        "total_articles_corpus": len(all_articles),
        "clusters_created": len(clusters),
        "duration_seconds": round(duration, 2)
    }

    logger.info("==========================================")
    logger.info("          INGESTION SUMMARY               ")
    logger.info(f" Feeds processed:             {stats['feeds_processed']}")
    logger.info(f" RSS items found:             {stats['rss_items_found']}")
    logger.info(f" New articles stored:         {stats['new_articles']}")
    logger.info(f" Duplicates skipped:          {stats['duplicates_skipped']}")
    logger.info(f" Extraction failures:         {stats['content_extraction_failures']}")
    logger.info(f" Total articles in system:    {stats['total_articles_corpus']}")
    logger.info(f" Clusters generated:          {stats['clusters_created']}")
    logger.info(f" Pipeline duration:           {stats['duration_seconds']}s")
    logger.info("==========================================")

    if job_id:
        db.update_job_status(
            job_id,
            status="completed",
            progress=100,
            articles_processed=total_found,
            articles_created=len(unique_new_articles),
            clusters_updated=len(clusters),
            details=json.dumps(stats)
        )

    return stats

def main():
    parser = argparse.ArgumentParser(description="News Pulse RSS Ingestion Pipeline")
    parser.add_argument("--job-id", type=str, default=None, help="Optional job ID for status tracking")
    args = parser.parse_args()

    try:
        stats = run_pipeline(job_id=args.job_id)
        print("\nIngestion completed successfully.")
        print(json.dumps(stats, indent=2))
    except Exception as e:
        logger.critical(f"Pipeline crashed with error: {e}", exc_info=True)
        if args.job_id:
            try:
                db = DatabaseManager()
                db.update_job_status(args.job_id, status="failed", error_message=str(e))
            except Exception:
                pass
        sys.exit(1)

if __name__ == "__main__":
    main()
