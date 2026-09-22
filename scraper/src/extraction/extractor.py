import logging
import requests
from bs4 import BeautifulSoup
from scraper.src.config.settings import DEFAULT_USER_AGENT, ARTICLE_REQUEST_TIMEOUT

logger = logging.getLogger(__name__)

class ArticleExtractor:
    def __init__(self, timeout: int = ARTICLE_REQUEST_TIMEOUT):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": DEFAULT_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        })

    def extract(self, url: str) -> dict:
        """
        Attempts to fetch full article body from URL.
        Uses BeautifulSoup with robust content selectors.
        Returns: { "content": str, "status": 'extracted' | 'fallback' | 'failed' }
        """
        if not url:
            return {"content": None, "status": "failed"}

        try:
            resp = self.session.get(url, timeout=self.timeout)
            if resp.status_code != 200:
                logger.warning(f"HTTP {resp.status_code} when extracting content for: {url}")
                return {"content": None, "status": "failed"}

            html = resp.text
            soup = BeautifulSoup(html, "html.parser")

            # Remove noise elements
            for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form", "svg", "noscript"]):
                tag.decompose()

            # Strategy 1: Targeted news selectors commonly used by major publishers
            article_body = ""
            selectors = [
                "article",
                '[data-component="text-block"]',
                ".article__body",
                ".story-body",
                ".article-body",
                ".wysiwyg",
                ".entry-content",
                'main',
            ]

            for sel in selectors:
                container = soup.select_one(sel)
                if container:
                    paragraphs = container.find_all("p")
                    texts = [p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 25]
                    if len(texts) >= 2:
                        article_body = "\n\n".join(texts)
                        break

            # Strategy 2: Fallback to all meaningful paragraphs in the document
            if not article_body or len(article_body) < 100:
                paragraphs = soup.find_all("p")
                valid_paragraphs = [
                    p.get_text(strip=True) for p in paragraphs
                    if len(p.get_text(strip=True)) > 30 and not p.find_parent(["footer", "nav", "header"])
                ]
                if len(valid_paragraphs) >= 2:
                    article_body = "\n\n".join(valid_paragraphs[:25])

            if article_body and len(article_body) >= 80:
                # Truncate to reasonable max length (e.g. 10000 chars) to prevent DB bloat
                return {"content": article_body[:10000], "status": "extracted"}
            else:
                return {"content": None, "status": "fallback"}

        except requests.exceptions.Timeout:
            logger.warning(f"Timeout while extracting {url}")
            return {"content": None, "status": "failed"}
        except requests.exceptions.RequestException as e:
            logger.warning(f"Request error for {url}: {e}")
            return {"content": None, "status": "failed"}
        except Exception as e:
            logger.warning(f"Unexpected extraction error for {url}: {e}")
            return {"content": None, "status": "failed"}
