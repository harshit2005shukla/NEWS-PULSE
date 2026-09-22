import hashlib
import re
from datetime import datetime, timezone
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

def normalize_url(url: str) -> str:
    """Strip tracking query params (utm_*, ref, etc.) and fragments for reliable canonical URL comparison."""
    if not url:
        return ""
    try:
        parsed = urlparse(url.strip())
        # Filter tracking params
        query_params = parse_qsl(parsed.query, keep_blank_values=False)
        clean_params = [
            (k, v) for k, v in query_params
            if not k.lower().startswith("utm_") and k.lower() not in ("ref", "fbclid", "gclid", "soc_src", "soc_trk")
        ]
        clean_query = urlencode(clean_params)
        # Normalize trailing slash
        path = parsed.path.rstrip("/")
        normalized = urlunparse((
            parsed.scheme.lower() or "https",
            parsed.netloc.lower(),
            path,
            "",
            clean_query,
            "" # strip fragment
        ))
        return normalized
    except Exception:
        return url.strip()

def compute_content_hash(title: str, summary: str = "", content: str = "") -> str:
    """Generate SHA256 hash of normalized text for content duplicate detection."""
    base_text = f"{title.strip().lower()}|{(summary or '').strip().lower()[:200]}"
    return hashlib.sha256(base_text.encode("utf-8")).hexdigest()

def clean_html_text(raw_html: str) -> str:
    """Basic HTML entity and tag stripping."""
    if not raw_html:
        return ""
    # Remove HTML tags
    clean = re.sub(r"<[^>]+>", " ", raw_html)
    # Remove extra spaces
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean

def parse_iso_or_rfc_date(date_str: str) -> datetime:
    """Fallback parser for dates."""
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        from email.utils import parsedate_to_datetime
        dt = parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)
