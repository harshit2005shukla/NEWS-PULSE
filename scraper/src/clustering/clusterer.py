import logging
from typing import List, Dict, Any, Set
from collections import Counter
from scraper.src.clustering.keyword_engine import (
    extract_meaningful_keywords,
    calculate_keyword_overlap,
    generate_cluster_label,
    STOP_WORDS
)
from scraper.src.config.settings import MIN_SHARED_KEYWORDS, SIMILARITY_THRESHOLD, USE_TFIDF

logger = logging.getLogger(__name__)

class TopicClusterer:
    """
    Groups articles into topic clusters using either:
    1. Keyword Overlap Grouping (default & explainable)
    2. TF-IDF + Cosine Similarity (when enabled and scikit-learn is present)
    """
    def __init__(
        self,
        min_shared_keywords: int = MIN_SHARED_KEYWORDS,
        similarity_threshold: float = SIMILARITY_THRESHOLD,
        use_tfidf: bool = USE_TFIDF
    ):
        self.min_shared_keywords = min_shared_keywords
        self.similarity_threshold = similarity_threshold
        self.use_tfidf = use_tfidf

    def cluster_articles(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Receives a list of article dicts.
        Returns a list of cluster dicts:
        {
           "label": str,
           "keywords": str,
           "articles": List[Dict[str, Any]],
           "earliest_time": datetime,
           "latest_time": datetime,
        }
        """
        if not articles:
            return []

        if len(articles) == 1:
            art = articles[0]
            kw = extract_meaningful_keywords(art.get("title", ""), art.get("summary", ""))
            label = generate_cluster_label([art.get("title", "")], [kw])
            return [{
                "label": label,
                "keywords": ", ".join(sorted(list(kw))[:6]),
                "articles": [art],
                "earliest_time": art.get("published_at"),
                "latest_time": art.get("published_at"),
            }]

        if self.use_tfidf and len(articles) >= 4:
            try:
                return self._cluster_with_tfidf(articles)
            except Exception as e:
                logger.warning(f"TF-IDF clustering fallback to keyword overlap: {e}")
                return self._cluster_with_keywords(articles)
        else:
            return self._cluster_with_keywords(articles)

    def _cluster_with_keywords(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deterministic Keyword Overlap Grouping using Connected Components / Greedy Centroid.
        Threshold: MIN_SHARED_KEYWORDS (default: 3).
        """
        # Precompute keyword sets
        article_kws: List[Set[str]] = [
            extract_meaningful_keywords(a.get("title", ""), a.get("summary", ""))
            for a in articles
        ]

        # Disjoint set / union-find
        n = len(articles)
        parent = list(range(n))

        def find(i: int) -> int:
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def union(i: int, j: int):
            root_i = find(i)
            root_j = find(j)
            if root_i != root_j:
                parent[root_i] = root_j

        # Compare pairs
        for i in range(n):
            for j in range(i + 1, n):
                overlap = calculate_keyword_overlap(article_kws[i], article_kws[j])
                # If titles share significant keywords or summary shares >= threshold
                if overlap >= self.min_shared_keywords:
                    union(i, j)

        # Group by root
        groups: Dict[int, List[int]] = {}
        for i in range(n):
            root = find(i)
            groups.setdefault(root, []).append(i)

        return self._format_clusters(groups, articles, article_kws)

    def _cluster_with_tfidf(self, articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        TF-IDF vectorizer + Cosine Similarity.
        Uses scikit-learn TfidfVectorizer.
        """
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.metrics.pairwise import cosine_similarity

        # Corpus: Title is repeated twice for extra weight vs summary
        corpus = [
            f"{a.get('title', '')} {a.get('title', '')} {a.get('summary', '')}"
            for a in articles
        ]

        custom_stop_words = list(STOP_WORDS)
        vectorizer = TfidfVectorizer(
            stop_words=custom_stop_words,
            min_df=1,
            max_df=0.9,
            ngram_range=(1, 2)
        )
        tfidf_matrix = vectorizer.fit_transform(corpus)
        similarity_matrix = cosine_similarity(tfidf_matrix)

        n = len(articles)
        parent = list(range(n))

        def find(i: int) -> int:
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def union(i: int, j: int):
            root_i = find(i)
            root_j = find(j)
            if root_i != root_j:
                parent[root_i] = root_j

        for i in range(n):
            for j in range(i + 1, n):
                sim = similarity_matrix[i, j]
                if sim >= self.similarity_threshold:
                    union(i, j)

        groups: Dict[int, List[int]] = {}
        for i in range(n):
            root = find(i)
            groups.setdefault(root, []).append(i)

        article_kws = [
            extract_meaningful_keywords(a.get("title", ""), a.get("summary", ""))
            for a in articles
        ]
        return self._format_clusters(groups, articles, article_kws)

    def _format_clusters(
        self,
        groups: Dict[int, List[int]],
        articles: List[Dict[str, Any]],
        article_kws: List[Set[str]]
    ) -> List[Dict[str, Any]]:
        clusters = []
        for root, indices in groups.items():
            cluster_articles = [articles[idx] for idx in indices]
            cluster_titles = [a.get("title", "") for a in cluster_articles]
            cluster_kws = [article_kws[idx] for idx in indices]

            label = generate_cluster_label(cluster_titles, cluster_kws)

            # Combined sorted keywords
            all_kw = Counter()
            for kw_set in cluster_kws:
                for kw in kw_set:
                    all_kw[kw] += 1
            top_keywords = [w for w, _ in all_kw.most_common(6)]

            # Times
            times = [a.get("published_at") for a in cluster_articles if a.get("published_at")]
            earliest = min(times) if times else None
            latest = max(times) if times else None

            clusters.append({
                "label": label,
                "keywords": ", ".join(top_keywords),
                "articles": cluster_articles,
                "earliest_time": earliest,
                "latest_time": latest,
                "article_count": len(cluster_articles)
            })

        # Sort clusters by article count descending, then latest time
        clusters.sort(key=lambda c: (c["article_count"], c["latest_time"] or ""), reverse=True)
        return clusters
