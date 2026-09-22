import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { Pool } from "pg";
import { spawn } from "child_process";
import crypto from "crypto";
import path from "path";
import { resolvePythonExecutable } from "./utils/python.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

// Healthcheck
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ status: "healthy", timestamp: result.rows[0].now });
  } catch (err: any) {
    res.status(500).json({ status: "unhealthy", error: err.message });
  }
});

// GET /clusters
app.get("/clusters", async (req, res) => {
  try {
    const { sources, search } = req.query;
    let query = `
      SELECT id, label, article_count AS "articleCount",
             earliest_article_time AS "startTime",
             latest_article_time AS "endTime",
             keywords
      FROM clusters
      ORDER BY article_count DESC, latest_article_time DESC
    `;
    const result = await pool.query(query);
    let rows = result.rows;

    if (sources && typeof sources === "string") {
      const activeSources = sources.split(",").map(s => s.trim().toLowerCase());
      const filteredResult = await pool.query(`
        SELECT DISTINCT cluster_id FROM articles WHERE LOWER(source) = ANY($1)
      `, [activeSources]);
      const validIds = new Set(filteredResult.rows.map(r => r.cluster_id));
      rows = rows.filter(r => validIds.has(r.id));
    }

    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.label && r.label.toLowerCase().includes(q)) ||
        (r.keywords && r.keywords.toLowerCase().includes(q))
      );
    }

    res.json(rows);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// GET /clusters/:id
app.get("/clusters/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_ID", message: "Cluster ID must be an integer" },
      });
    }

    const clusterRes = await pool.query("SELECT * FROM clusters WHERE id = $1", [id]);
    if (clusterRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "CLUSTER_NOT_FOUND", message: `Cluster ${id} not found` },
      });
    }

    const articlesRes = await pool.query(`
      SELECT id, source, title, summary, content, url, author,
             published_at AS "publishedAt", extraction_status AS "extractionStatus"
      FROM articles
      WHERE cluster_id = $1
      ORDER BY published_at DESC
    `, [id]);

    const c = clusterRes.rows[0];
    res.json({
      id: c.id,
      label: c.label,
      articleCount: c.article_count,
      keywords: c.keywords,
      earliestArticleTime: c.earliest_article_time,
      latestArticleTime: c.latest_article_time,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      articles: articlesRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// GET /timeline
app.get("/timeline", async (req, res) => {
  try {
    const { sources, search } = req.query;

    const clustersRes = await pool.query(`
      SELECT id, label, article_count AS "articleCount",
             earliest_article_time AS "startTime",
             latest_article_time AS "endTime",
             keywords
      FROM clusters
      ORDER BY article_count DESC, latest_article_time DESC
    `);

    const sourcesRes = await pool.query(`
      SELECT cluster_id, source FROM articles WHERE cluster_id IS NOT NULL
    `);

    const clusterSources = new Map<number, Set<string>>();
    for (const row of sourcesRes.rows) {
      if (!clusterSources.has(row.cluster_id)) {
        clusterSources.set(row.cluster_id, new Set());
      }
      clusterSources.get(row.cluster_id)!.add(row.source);
    }

    let timeline = clustersRes.rows.map(c => ({
      id: c.id,
      label: c.label,
      startTime: c.startTime,
      endTime: c.endTime,
      articleCount: c.articleCount,
      intensity: c.articleCount,
      keywords: c.keywords,
      sources: Array.from(clusterSources.get(c.id) || []),
    }));

    if (sources && typeof sources === "string") {
      const activeList = sources.split(",").map(s => s.trim().toLowerCase());
      timeline = timeline.filter(t => t.sources.some(s => activeList.includes(s.toLowerCase())));
    }

    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      timeline = timeline.filter(t =>
        (t.label && t.label.toLowerCase().includes(q)) ||
        (t.keywords && t.keywords.toLowerCase().includes(q))
      );
    }

    res.json(timeline);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// POST /ingest/trigger
app.post("/ingest/trigger", async (req, res) => {
  try {
    const running = await pool.query("SELECT id FROM ingestion_jobs WHERE status = 'running' LIMIT 1");
    if (running.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: "INGESTION_RUNNING",
          message: "An ingestion job is already running",
          jobId: running.rows[0].id,
        },
      });
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    await pool.query(`
      INSERT INTO ingestion_jobs (id, status, progress, started_at)
      VALUES ($1, 'queued', 0, NOW())
    `, [jobId]);

    const projectRoot = path.resolve(__dirname, "../..");
    const pythonScript = path.join(projectRoot, "scraper/src/main.py");
    const pythonExecutable = resolvePythonExecutable(projectRoot);
    const py = spawn(pythonExecutable, [pythonScript, "--job-id", jobId], {
      cwd: projectRoot,
      env: {
        ...process.env,
        PYTHONPATH: projectRoot,
        DATABASE_URL,
      },
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let outputLog = "";
    py.stdout.on("data", (data) => { outputLog += data.toString(); });
    py.stderr.on("data", (data) => { outputLog += data.toString(); });
    py.on("error", async (error) => {
      console.error(`[Job ${jobId}] Unable to start Python scraper:`, error);
      await pool.query(`
        UPDATE ingestion_jobs
        SET status = 'failed', completed_at = NOW(),
            error_message = $2, details = $3
        WHERE id = $1
      `, [
        jobId,
        `Unable to start Python scraper (${pythonExecutable}). Install scraper/requirements.txt or set PYTHON_PATH.`,
        error.message,
      ]);
    });

    res.status(202).json({
      jobId,
      status: "queued",
      message: "News ingestion job triggered successfully",
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// GET /ingest/status/:jobId
app.get("/ingest/status/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await pool.query("SELECT * FROM ingestion_jobs WHERE id = $1", [jobId]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: "JOB_NOT_FOUND", message: `Job ${jobId} not found` },
      });
    }

    const job = result.rows[0];
    let details = null;
    if (job.details) {
      try { details = JSON.parse(job.details); } catch { details = job.details; }
    }

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      articlesProcessed: job.articles_processed,
      articlesCreated: job.articles_created,
      clustersUpdated: job.clusters_updated,
      errorMessage: job.error_message,
      details,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: err.message },
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: "UNHANDLED_EXCEPTION",
      message: err.message || "An unexpected error occurred",
    },
  });
});

export { app, pool };

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`News Pulse Express REST API listening on port ${PORT}`);
  });
}
