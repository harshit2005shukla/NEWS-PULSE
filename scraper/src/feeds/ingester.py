import logging
from typing import List, Dict, Any
import feedparser
from scraper.src.config.settings import DEFAULT_FEEDS, MAX_ARTICLES_PER_FEED
from scraper.src.normalization.normalizer import normalize_rss_entry

logger = logging.getLogger(__name__)

class FeedIngester:
    def __init__(self, feeds: List[Dict[str, Any]] = None):
        self.feeds = feeds or DEFAULT_FEEDS

    def fetch_all(self) -> List[Dict[str, Any]]:
        """
        Fetches all configured feeds.
        Resilient: if one feed fails or times out, logs the failure and continues to the others.
        """
        collected_articles: List[Dict[str, Any]] = []

        for feed_config in self.feeds:
            if not feed_config.get("enabled", True):
                continue

            feed_name = feed_config["name"]
            feed_url = feed_config["url"]
            logger.info(f"Fetching RSS feed: {feed_name} ({feed_url})")

            try:
                # feedparser handles various encodings & XML nuances
                parsed = feedparser.parse(feed_url)
                
                # Check for parsing errors
                if hasattr(parsed, "bozo") and parsed.bozo and not parsed.entries:
                    logger.warning(f"Feed {feed_name} bozo exception: {getattr(parsed, 'bozo_exception', 'unknown')}")
                    continue

                entries = parsed.entries or []
                logger.info(f"Feed {feed_name}: retrieved {len(entries)} raw items")

                count = 0
                for entry in entries[:MAX_ARTICLES_PER_FEED]:
                    normalized = normalize_rss_entry(entry, feed_name)
                    if normalized:
                        collected_articles.append(normalized)
                        count += 1

                logger.info(f"Feed {feed_name}: normalized {count} articles")

            except Exception as e:
                logger.error(f"Error fetching feed {feed_name} from {feed_url}: {e}", exc_info=True)
                # Continue with remaining feeds - never crash entire pipeline

        return collected_articles
