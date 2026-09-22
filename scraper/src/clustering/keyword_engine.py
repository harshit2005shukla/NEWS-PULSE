import re
from typing import Set, List
from collections import Counter

# Standard English stop words + common news boilerplate terms
STOP_WORDS: Set[str] = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
    "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't",
    "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have",
    "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him",
    "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't",
    "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor",
    "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out",
    "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some",
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through",
    "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've",
    "were", "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who",
    "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll",
    "you're", "you've", "your", "yours", "yourself", "yourselves",
    # Common news noise words
    "said", "says", "told", "also", "new", "one", "two", "three", "first", "last", "year", "years", "day",
    "days", "today", "yesterday", "tomorrow", "week", "weeks", "month", "months", "may", "will", "can",
    "just", "like", "now", "people", "report", "reported", "reporting", "reports", "according", "update",
    "live", "video", "photos", "watch", "read", "share", "bbc", "npr", "guardian", "aljazeera", "news"
}

def clean_text_for_clustering(text: str) -> str:
    """Lowercase and remove special characters."""
    if not text:
        return ""
    text = text.lower()
    text = re.sub(r"[^\w\s-]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_meaningful_keywords(title: str, summary: str = "", min_len: int = 3) -> Set[str]:
    """
    Extract meaningful words from title (heavily weighted) and summary.
    1. Lowercases text
    2. Tokenizes
    3. Removes punctuation
    4. Filters out stop words and short tokens (< min_len)
    """
    text = f"{title} {summary}"
    cleaned = clean_text_for_clustering(text)
    tokens = re.findall(r"\b[a-zA-Z]{" + str(min_len) + r",}\b", cleaned)
    keywords = {t for t in tokens if t not in STOP_WORDS}
    return keywords

def calculate_keyword_overlap(set_a: Set[str], set_b: Set[str]) -> int:
    """Count number of shared meaningful terms."""
    return len(set_a.intersection(set_b))

def generate_cluster_label(article_titles: List[str], article_keywords_list: List[Set[str]]) -> str:
    """
    Generate an intuitive, human-readable topic label (e.g. 'White House Ban Lawsuit', 'Haiti President Assassination').
    Identifies dominant topic keywords across articles and looks for cohesive phrasing in actual headlines.
    """
    if not article_titles:
        return "General News"

    # Count frequency of keywords across articles
    counter = Counter()
    for kw_set in article_keywords_list:
        for kw in kw_set:
            counter[kw] += 1

    # If cluster has multiple articles, prioritize words appearing in >= 2 articles
    if len(article_titles) > 1:
        top_words = [word for word, count in counter.most_common(6) if count >= 2]
        if len(top_words) >= 2:
            # Check if any original headline contains a coherent subphrase of these top words
            for title in sorted(article_titles, key=len):
                clean_t = re.sub(r"^(live|watch|breaking|update|exclusive):\s*", "", title, flags=re.IGNORECASE).strip()
                clean_t = re.sub(r"\s*-\s*(bbc news|the guardian|npr news|al jazeera).*$", "", clean_t, flags=re.IGNORECASE)
                words = clean_t.split()
                # Find concise phrase of 3-5 words containing top words
                if len(words) <= 7:
                    return clean_t
                else:
                    return " ".join(words[:6])

            # Or join top 3 meaningful words cleanly
            return " ".join(top_words[:3]).title()

    # For single article cluster, use clean concise title
    shortest_title = min(article_titles, key=lambda t: len(t.split()))
    cleaned_title = re.sub(r"^(live|watch|breaking|update|exclusive):\s*", "", shortest_title, flags=re.IGNORECASE)
    cleaned_title = re.sub(r"\s*-\s*(bbc news|the guardian|npr news|al jazeera).*$", "", cleaned_title, flags=re.IGNORECASE)
    words = cleaned_title.strip().split()
    if len(words) > 7:
        return " ".join(words[:7]).title()
    return cleaned_title.title()
