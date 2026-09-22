# News Pulse API Documentation

Base URL: `/` for the browser-facing Next.js REST routes. The same handlers remain available under `/api/*` for backward compatibility, and the standalone Express service exposes the equivalent routes at `http://localhost:4000`.

All timestamp fields are in standard ISO-8601 UTC format (`YYYY-MM-DDTHH:mm:ss.sssZ`).

---

### 1. GET `/api/clusters`
Returns all topic clusters ordered by article count descending, then latest article time.

#### Request Query Parameters:
- `sources` *(optional, string)*: Comma-separated list of news sources to filter clusters by (e.g. `BBC News,The Guardian`).
- `search` *(optional, string)*: Substring keyword search on cluster label or keywords.

#### Success Response (200 OK):
```json
[
  {
    "id": 1,
    "label": "Trump Ban White House",
    "articleCount": 3,
    "startTime": "2026-09-21T08:39:38.000Z",
    "endTime": "2026-09-21T13:15:24.000Z",
    "keywords": "trump, ban, white, house, politico, cnn"
  }
]
```

---

### 2. GET `/api/clusters/:id`
Retrieves comprehensive details of a cluster and all of its associated articles in chronological order.

#### Path Parameters:
- `id` *(integer, required)*: Cluster numeric identifier.

#### Success Response (200 OK):
```json
{
  "id": 1,
  "label": "Trump Ban White House",
  "articleCount": 3,
  "keywords": "trump, ban, white, house, politico, cnn",
  "earliestArticleTime": "2026-09-21T08:39:38.000Z",
  "latestArticleTime": "2026-09-21T13:15:24.000Z",
  "createdAt": "2026-09-21T13:59:01.000Z",
  "updatedAt": "2026-09-21T13:59:01.000Z",
  "articles": [
    {
      "id": 14,
      "source": "BBC News",
      "title": "White House limits access for certain reporters",
      "summary": "The administration announced new media credentials policies...",
      "content": "Full extracted article content from trafilatura / BS4...",
      "url": "https://feeds.bbci.co.uk/news/world-68001",
      "author": "BBC World News",
      "publishedAt": "2026-09-21T13:15:24.000Z",
      "extractionStatus": "extracted"
    }
  ]
}
```

#### Error Responses:
- `400 Bad Request`: `{"success": false, "error": {"code": "INVALID_CLUSTER_ID", "message": "Cluster ID must be a valid integer"}}`
- `404 Not Found`: `{"success": false, "error": {"code": "CLUSTER_NOT_FOUND", "message": "Cluster with ID 999 was not found"}}`

---

### 3. GET `/api/timeline`
Optimized payload for timeline rendering containing start/end bounds and intensity indicators.

#### Query Parameters:
- `sources` *(optional)*: Filter clusters containing articles from specific sources.
- `search` *(optional)*: Filter by topic or keywords.

#### Success Response (200 OK):
```json
[
  {
    "id": 1,
    "label": "Trump Ban White House",
    "startTime": "2026-09-21T08:39:38.000Z",
    "endTime": "2026-09-21T13:15:24.000Z",
    "articleCount": 3,
    "intensity": 3,
    "keywords": "trump, ban, white, house, politico, cnn",
    "sources": ["BBC News", "The Guardian", "NPR"]
  }
]
```

---

### 4. POST `/api/ingest/trigger`
Queues and triggers the Python RSS scraper and topic clustering pipeline. Non-blocking.

#### Success Response (202 Accepted):
```json
{
  "jobId": "job_1726927123456_a4b9c1",
  "status": "queued",
  "message": "News ingestion job triggered successfully"
}
```

#### Error Responses:
- `409 Conflict`: `{"success": false, "error": {"code": "INGESTION_ALREADY_IN_PROGRESS", "message": "An ingestion job is currently running."}}`

---

### 5. GET `/api/ingest/status/:jobId`
Poll the execution progress and result metrics of an ingestion run.

#### Success Response (200 OK):
```json
{
  "jobId": "job_1726927123456_a4b9c1",
  "status": "completed",
  "progress": 100,
  "startedAt": "2026-09-21T13:58:46.000Z",
  "completedAt": "2026-09-21T13:58:53.000Z",
  "articlesProcessed": 70,
  "articlesCreated": 21,
  "clustersUpdated": 63,
  "errorMessage": null,
  "details": {
    "feeds_processed": 4,
    "rss_items_found": 70,
    "new_articles": 21,
    "duplicates_skipped": 49,
    "content_extraction_failures": 0,
    "total_articles_corpus": 70,
    "clusters_created": 63,
    "duration_seconds": 6.85
  }
}
```
