# News Pulse System Architecture

## Architecture Diagram

```
[ Public RSS Feeds ] (BBC, NPR, Guardian, Al Jazeera)
        │
        ▼
[ Python Scraper Subsystem ]
  ├─ FeedIngester (feedparser, multi-format normalization)
  ├─ URL Normalizer & Content Hasher (Canonicalization & SHA-256)
  ├─ ArticleExtractor (trafilatura & BeautifulSoup fallbacks)
  └─ TopicClusterer (Keyword Overlap / TF-IDF Vectorization)
        │
        ▼
[ PostgreSQL Database ]
  ├─ `articles` (deduplicated, indexed on url, content_hash, published_at)
  ├─ `clusters` (topic labels, bounds, article counts)
  └─ `ingestion_jobs` (async job status, progress, statistics)
        │
        ▼
[ Node.js REST API Layer ]
  ├─ Next.js App Router API Routes (`/api/clusters`, `/api/timeline`, `/api/ingest`)
  └─ Express.js Standalone Service (`backend/src/server.ts`)
        │
        ▼
[ Next.js + React Frontend Dashboard ]
  ├─ TimelineVisualizer (Horizontal temporal tracks)
  ├─ SourceFilters (BBC, NPR, Guardian, Al Jazeera toggles)
  ├─ ClusterDetailDrawer (Side-panel with article bodies & publisher links)
  └─ Real-Time Ingestion Job Polling & Progress Indicator
```

## Why Each Layer Exists

### 1. Python RSS Pipeline
- **Role**: Heavy-duty extraction and NLP-driven text mining.
- **Why Python?**: Industry standard for scraping and text processing (`feedparser`, `beautifulsoup4`, `scikit-learn`). It effortlessly handles heterogeneous RSS XML dialects (such as `content:encoded` vs `summary`), handles character encodings, and provides deterministic text vectorization.

### 2. Normalization & Deduplication Layer
- **Role**: Protects database integrity.
- **Mechanism**: Strips transient URL tracking parameters (`utm_*`, `ref`, `soc_trk`) and computes an immutable content SHA-256 hash. If 120 items are found and 90 already exist, only the 30 new articles are processed.

### 3. Clustering Engine
- **Role**: Transforms isolated news items into contextual stories.
- **Keyword Overlap**: Removes common news noise words and computes shared keyword intersection.
- **TF-IDF + Cosine Similarity**: Evaluates term significance against document frequency across the corpus.

### 4. PostgreSQL Database
- **Role**: ACID-compliant persistent relational storage.
- **Indexes**: Applied to `url`, `content_hash`, `published_at`, `source`, and `cluster_id` to guarantee fast timeline aggregations and sub-millisecond duplicate checks.

### 5. Node.js API & Job System
- **Role**: Coordinates data retrieval and pipeline triggers safely.
- **Subprocess Spawning**: Triggers Python ingestion asynchronously without locking HTTP threads, returning an immediate `jobId` that the frontend polls.

### 6. React + Tailwind Frontend
- **Role**: High-clarity visual intelligence dashboard.
- **Timeline**: Plots clusters across their temporal lifespan with visual marker weight proportional to article density.
