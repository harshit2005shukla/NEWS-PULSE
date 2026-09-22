import unittest
from datetime import datetime, timezone
from scraper.src.utils.text_utils import normalize_url, compute_content_hash, clean_html_text
from scraper.src.clustering.keyword_engine import (
    extract_meaningful_keywords,
    calculate_keyword_overlap,
    generate_cluster_label,
)
from scraper.src.normalization.normalizer import normalize_rss_entry

class DummyEntry:
    def __init__(self, title, link, summary=None, published_parsed=None):
        self.title = title
        self.link = link
        self.summary = summary
        self.published_parsed = published_parsed

class TestPipeline(unittest.TestCase):
    def test_url_normalization(self):
        url1 = "https://www.bbc.com/news/world-12345?utm_source=rss&utm_medium=feed#article"
        url2 = "https://www.bbc.com/news/world-12345"
        self.assertEqual(normalize_url(url1), normalize_url(url2))

    def test_content_hash(self):
        h1 = compute_content_hash("Breaking News Headline", "Short summary")
        h2 = compute_content_hash("breaking news headline  ", "short summary")
        self.assertEqual(h1, h2)

    def test_clean_html_text(self):
        raw = "<p>Hello <b>World</b>! &amp; welcome.</p>"
        cleaned = clean_html_text(raw)
        self.assertNotIn("<p>", cleaned)
        self.assertIn("Hello World", cleaned)

    def test_keyword_extraction(self):
        title = "Government introduces strict AI regulations and safety policies"
        keywords = extract_meaningful_keywords(title)
        self.assertIn("government", keywords)
        self.assertIn("regulations", keywords)
        self.assertIn("safety", keywords)
        self.assertIn("policies", keywords)
        # Stop words should not be present
        self.assertNotIn("and", keywords)

    def test_keyword_overlap_and_clustering(self):
        art_a = "Government introduces strict AI regulation framework"
        art_b = "New AI regulation framework proposed by government"
        art_c = "Local football team wins championship tournament"

        kw_a = extract_meaningful_keywords(art_a)
        kw_b = extract_meaningful_keywords(art_b)
        kw_c = extract_meaningful_keywords(art_c)

        overlap_ab = calculate_keyword_overlap(kw_a, kw_b)
        overlap_ac = calculate_keyword_overlap(kw_a, kw_c)

        self.assertGreaterEqual(overlap_ab, 3)
        self.assertLess(overlap_ac, 2)

    def test_cluster_label_generation(self):
        titles = [
            "Government announces AI regulation rules",
            "Officials introduce AI regulation policies"
        ]
        kws = [extract_meaningful_keywords(t) for t in titles]
        label = generate_cluster_label(titles, kws)
        self.assertIsInstance(label, str)
        self.assertGreater(len(label), 0)

    def test_normalize_rss_entry(self):
        dummy = DummyEntry(
            title="World Bank announces economic outlook",
            link="https://feeds.npr.org/story/1001?utm_campaign=feed",
            summary="<p>Global economic forecast released today.</p>"
        )
        res = normalize_rss_entry(dummy, "NPR")
        self.assertIsNotNone(res)
        self.assertEqual(res["source"], "NPR")
        self.assertEqual(res["title"], "World Bank announces economic outlook")
        self.assertEqual(res["url"], "https://feeds.npr.org/story/1001")

if __name__ == "__main__":
    unittest.main()
