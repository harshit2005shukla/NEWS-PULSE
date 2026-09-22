# News Pulse — Topic-Clustered News Timeline

**News Pulse** is a complete, production-grade news intelligence system that collects articles from multiple public RSS feeds, extracts full article content, normalizes schemas, performs URL and content-hash deduplication, groups related articles into topic clusters using NLP keyword overlap and TF-IDF similarity, and renders them onto an interactive time-based timeline.

Built as an internship technical assessment demonstration.

---

## Architecture & Data Flow

```
RSS Feeds (BBC, NPR, Guardian, Al Jazeera)
      │
      ▼
Python Ingestion Pipeline
  ├─ Feed Parser & Format Normalizer
  ├─ Content Extractor (BeautifulSoup / trafilatura fallback)
  ├─ Deduplication (Canonical URL + SHA-256 Content Hash)
  └─ Topic Clustering Engine (Keyword Overlap & TF-IDF)
      │
      ▼
PostgreSQL Database (Articles, Clusters, Ingestion Jobs)
      │
      ▼
Node.js REST API (App Router & Express Routes)
      │
      ▼
Next.js + React Frontend (Interactive Timeline, Filters, Cluster Drawer)
```

---

## Tech Stack

- **Scraper / NLP**: Python 3.11, `feedparser`, `beautifulsoup4`, `scikit-learn`, `requests`, `psycopg2-binary`.
- **Backend**: Node.js, Express.js REST API, Next.js App Router API endpoints, Drizzle ORM, PostgreSQL.
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, Lucide React icons.
- **Database**: Local PostgreSQL or hosted Supabase / Neon PostgreSQL.

---

## Topic Clustering Approach & Reasoning

### How It Works:
1. **Preprocessing**: Titles and summaries are converted to lowercase, stripped of HTML tags, punctuation, and English stop words (augmented with common news noise words like *said*, *breaking*, *update*, *live*).
2. **Keyword Extraction**: Meaningful tokens are extracted into set representations.
3. **Similarity & Clustering**:
   - **Keyword Overlap**: Calculates the intersection of meaningful tokens between article pairs using a configurable threshold (`MIN_SHARED_KEYWORDS=3`).
   - **TF-IDF + Cosine Similarity**: When active, vectorizes title (2x weight) and summary, clustering documents with cosine similarity $\ge 0.22$.
4. **Cluster Labeling**: Aggregates top shared keywords and extracts natural headline phrasing (e.g., *"Trump Ban White House"* rather than generic labels like *"Cluster 4"*).

### Parameter Selection & Limitations:
- **Threshold (`MIN_SHARED_KEYWORDS = 3`)**: Selected after testing against live BBC, NPR, and Guardian feeds. A threshold of 2 produced spurious clusters (e.g. any two articles mentioning "police" and "city"), while a threshold of 4 fragmented closely related coverage.
- **Known Limitation**: Transitive chaining in connected components (Article A overlaps with B, and B overlaps with C, which may pull slightly divergent stories into one umbrella topic). For very large corpora, hierarchical agglomerative clustering with strict distance cuts is recommended.

---

## Local Development Setup

### 1. Prerequisites
- Node.js >= 18
- Python >= 3.10
- PostgreSQL instance running on port 5432

### 2. Database Setup
Create database `app_db` and apply the Drizzle schema:
```bash
createdb app_db
cp .env.example .env
# Edit .env if your PostgreSQL credentials differ
npx drizzle-kit push
```

If PostgreSQL is not installed locally, start the included database container instead:
```bash
docker compose up -d db
npx drizzle-kit push
```

Verify the database-backed application health endpoint after starting Next.js:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/timeline
```

### 3. Python Scraper Setup

**macOS / Linux:**
```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
PYTHONPATH=.. python src/main.py
```

**Windows PowerShell:**
```powershell
cd scraper
py -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install -r requirements.txt
$env:PYTHONPATH=".."
python src/main.py
```

The Next.js refresh endpoint automatically prefers `scraper/.venv` on both platforms. Set `PYTHON_PATH` only when using a different Python installation.

For local development, copy `.env.example` to `.env` and use the included Docker PostgreSQL instance on host port `5433`. For production, `DATABASE_URL` is mandatory and must be configured in the deployment environment.

### 4. Application Server Setup
From the project root:
```bash
npm install
npm run build
npm start
```
Or for development:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Running Automated Tests

### Python Tests (Normalization, Deduplication, Keywords, Clustering)
```bash
PYTHONPATH=. python3 scraper/tests/test_pipeline.py
```

### Node.js Backend Tests
```bash
node --test backend/tests/api.test.js
```

---

## Video Walkthrough Script (2–3 Minutes)

- **0:00 – 0:45: Live Dashboard Overview**
  - "Hello! Here is News Pulse, a live topic-clustered news intelligence dashboard. Across the top, we see current system stats: 70 total articles across BBC, NPR, Guardian, and Al Jazeera grouped into active topic clusters. On the main view, each topic is plotted on a horizontal time axis showing its lifespan."
- **0:45 – 1:45: Ingestion Pipeline & Topic Clustering**
  - "When the ingestion pipeline runs, articles from different RSS feeds are converted to a normalized schema. Duplicate articles are skipped using canonical URLs and SHA-256 content hashes. The clustering engine then analyzes meaningful keywords and TF-IDF cosine similarity, grouping related coverage from competing outlets and generating human-readable labels."
- **1:45 – 2:25: Interactive Timeline & Job System**
  - "Clicking any cluster opens a detail drawer showing all coverage chronologically with full extracted article bodies and original publisher links. Clicking 'Refresh Data' dispatches an asynchronous job to the Python pipeline while polling real-time progress without blocking the UI."
- **2:25 – 2:45: Production Deployment & Future Enhancements**
  - "The database schema is fully indexed with Drizzle ORM on PostgreSQL, ready for Vercel and Fly.io/Render. For future enhancements, we plan to implement cross-lingual embeddings for international feeds and named entity recognition."

---

## Final Feature Checklist

- [x] Four live public RSS feeds (BBC, NPR, Guardian, Al Jazeera)
- [x] RSS schema differences normalized
- [x] Full article text extraction with fallback strategies
- [x] Canonical URL and content-hash deduplication
- [x] Re-runnable, idempotent scraper execution
- [x] Topic clustering engine (Keyword Overlap + TF-IDF)
- [x] Informative human-readable cluster labels
- [x] Interactive horizontal timeline visualization
- [x] Cluster detail drawer with chronological articles and links
- [x] Source filtering and real-time search
- [x] Non-blocking refresh job trigger and progress polling
- [x] PostgreSQL database with indexed schema
- [x] Comprehensive test suites (Python & Node.js)
- [x] Architecture & API documentation
