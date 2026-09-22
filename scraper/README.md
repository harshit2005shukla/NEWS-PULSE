# News Pulse — RSS Ingestion & Topic Clustering Pipeline

The Python pipeline is responsible for:
1. Fetching live news articles from multiple diverse RSS sources (BBC, NPR, The Guardian, Al Jazeera).
2. Content extraction (full body text extraction with BeautifulSoup/trafilatura fallback strategies).
3. URL and Content-Hash based deduplication for idempotent re-runs.
4. Intelligent topic clustering using configurable keyword overlap and TF-IDF cosine similarity.
5. Persisting articles and dynamic cluster links to PostgreSQL.

## Directory Structure
- `src/config/`: Configuration settings (feed endpoints, thresholds, user-agents).
- `src/feeds/`: Resilient RSS ingester handling different XML nuances.
- `src/extraction/`: HTML parsing and article text extractor with timeout & fallback.
- `src/normalization/`: Schema normalizer ensuring a uniform internal representation.
- `src/clustering/`: Keyword overlap algorithm + TF-IDF engine and human-readable cluster label generator.
- `src/database/`: PostgreSQL database manager.
- `src/main.py`: CLI entry point supporting manual execution and Node.js child-process invocation.
- `tests/`: Automated unit tests for URL normalization, hash generation, keyword extraction, and clustering.

## Running Manually
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. python3 src/main.py
```

## Running Tests
```bash
PYTHONPATH=. python3 tests/test_pipeline.py
```
