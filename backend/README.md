# News Pulse — Node.js / Express REST API

This service exposes the topic clusters, chronologically organized articles, timeline datasets, and provides job-controlled endpoints for triggering and polling the Python RSS ingestion pipeline.

## Endpoints

### 1. `GET /clusters`
Returns list of topic clusters sorted by article count and latest activity.
- Query params: `sources` (comma-separated), `search` (keyword)

### 2. `GET /clusters/:id`
Returns full cluster details including all related articles sorted chronologically with headline, summary, original publication date, and source link.

### 3. `GET /timeline`
Returns an optimized timeline payload ready for visual rendering, containing time bounds (`startTime`, `endTime`), intensity, and contributing sources.

### 4. `POST /ingest/trigger`
Queues and triggers the Python ingestion pipeline in a non-blocking subprocess, returning a unique `jobId`.

### 5. `GET /ingest/status/:jobId`
Polls the execution status (`queued`, `running`, `completed`, `failed`), progress percentage, and article metrics.

## Running Locally
```bash
npm install
npm run dev
```
Runs on port 4000 (or `PORT` from `.env`).
