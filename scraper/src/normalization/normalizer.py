from datetime import datetime, timezone
import calendar
from typing import Any, Dict, Optional
from scraper.src.utils.text_utils import normalize_url, compute_content_hash, clean_html_text

def normalize_rss_entry(entry: Any, source_name: str) -> Optional[Dict[str, Any]]:
    """
    Transforms diverse RSS structures (BBC, NPR, Guardian, Al Jazeera)
    into a unified Article dictionary.
    """
    title = getattr(entry, "title", "").strip()
    link = getattr(entry, "link", "").strip()
    
    if not title or not link:
        return None

    canonical_url = normalize_url(link)
    if not canonical_url:
        return None

    # Handle summary/description vs content:encoded
    summary = ""
    if hasattr(entry, "summary") and entry.summary:
        summary = entry.summary
    elif hasattr(entry, "description") and entry.description:
        summary = entry.description
    elif hasattr(entry, "content") and entry.content and len(entry.content) > 0:
        summary = entry.content[0].get("value", "")

    summary_clean = clean_html_text(summary)

    # Handle publication date
    pub_dt = None
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        try:
            timestamp = calendar.timegm(entry.published_parsed)
            pub_dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except Exception:
            pass
    elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
        try:
            timestamp = calendar.timegm(entry.updated_parsed)
            pub_dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except Exception:
            pass

    if pub_dt is None:
        pub_dt = datetime.now(timezone.utc)

    # Author extraction
    author = getattr(entry, "author", None)
    if not author and hasattr(entry, "authors") and entry.authors:
        author = ", ".join([a.get("name", "") for a in entry.authors if a.get("name")])

    content_hash = compute_content_hash(title, summary_clean)

    return {
        "source": source_name,
        "title": title,
        "summary": summary_clean,
        "content": None,
        "url": canonical_url,
        "author": author or None,
        "published_at": pub_dt,
        "content_hash": content_hash,
        "extraction_status": "pending",
    }
