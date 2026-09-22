import os

# Database
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/app_db")

# Scraper Settings
DEFAULT_USER_AGENT = os.getenv(
    "USER_AGENT",
    "NewsPulseBot/1.0 (+https://github.com/newspulse/newspulse; news assessment aggregator)"
)
ARTICLE_REQUEST_TIMEOUT = int(os.getenv("ARTICLE_REQUEST_TIMEOUT", "6"))
MAX_ARTICLES_PER_FEED = int(os.getenv("MAX_ARTICLES_PER_FEED", "20"))

# Clustering Settings
MIN_SHARED_KEYWORDS = int(os.getenv("MIN_SHARED_KEYWORDS", "3"))
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.22"))
USE_TFIDF = os.getenv("USE_TFIDF", "true").lower() in ("true", "1", "yes")

# Configurable RSS Feeds
DEFAULT_FEEDS = [
    {
        "name": "BBC News",
        "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
        "enabled": True,
    },
    {
        "name": "NPR",
        "url": "https://feeds.npr.org/1001/rss.xml",
        "enabled": True,
    },
    {
        "name": "The Guardian",
        "url": "https://www.theguardian.com/world/rss",
        "enabled": True,
    },
    {
        "name": "Al Jazeera",
        "url": "https://www.aljazeera.com/xml/rss/all.xml",
        "enabled": True,
    },
]
