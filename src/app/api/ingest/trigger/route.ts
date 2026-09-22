import { NextResponse } from "next/server";
import { db } from "@/db";
import { ingestionJobs } from "@/db/schema";
import { spawn } from "child_process";
import crypto from "crypto";
import { eq, desc } from "drizzle-orm";
import path from "path";
import { existsSync } from "fs";

function resolvePythonExecutable(projectRoot: string): string {
  // On Windows, a Unix-style `python3` value in .env is usually not a valid
  // executable. Prefer the project's venv, then the system Python launcher.
  if (process.env.PYTHON_PATH) {
    const configured = process.env.PYTHON_PATH.trim();
    const looksLikeWindowsUnixAlias = process.platform === "win32" &&
      (configured === "python3" || configured === "python3.exe");
    if (!looksLikeWindowsUnixAlias) return configured;
  }

  const localCandidates = process.platform === "win32"
    ? [
        path.join(projectRoot, "scraper", ".venv", "Scripts", "python.exe"),
        path.join(projectRoot, ".venv", "Scripts", "python.exe"),
      ]
    : [
        path.join(projectRoot, "scraper", ".venv", "bin", "python"),
        path.join(projectRoot, ".venv", "bin", "python3"),
        path.join(projectRoot, ".venv", "bin", "python"),
      ];

  const localPython = localCandidates.find((candidate) => existsSync(candidate));
  if (localPython) return localPython;

  return process.platform === "win32" ? "py" : "python3";
}

// In-memory tracker for actively running subprocesses
let activeProcess: any = null;

export async function POST() {
  try {
    // Check if an ingestion is already running
    const existingRunning = await db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.status, "running"))
      .limit(1);

    if (existingRunning.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INGESTION_ALREADY_IN_PROGRESS",
            message: "An ingestion job is currently running. Please wait for it to finish.",
            jobId: existingRunning[0].id,
          },
        },
        { status: 409 }
      );
    }

    const jobId = `job_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;

    // Insert job into database
    await db.insert(ingestionJobs).values({
      id: jobId,
      status: "queued",
      progress: 0,
      startedAt: new Date(),
    });

    // Safely spawn the Python scraper pipeline
    const projectRoot = process.cwd();
    const scraperScript = path.join(projectRoot, "scraper/src/main.py");
    const pythonExecutable = resolvePythonExecutable(projectRoot);

    const env = {
      ...process.env,
      PYTHONPATH: projectRoot,
      DATABASE_URL: process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
    };

    const pyProcess = spawn(pythonExecutable, [scraperScript, "--job-id", jobId], {
      cwd: projectRoot,
      env,
      detached: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    activeProcess = pyProcess;

    let outputLog = "";
    pyProcess.stdout.on("data", (data) => {
      outputLog += data.toString();
    });

    pyProcess.stderr.on("data", (data) => {
      outputLog += data.toString();
    });

    pyProcess.on("error", async (error) => {
      activeProcess = null;
      console.error(`[Job ${jobId}] Unable to start Python scraper:`, error);
      try {
        await db
          .update(ingestionJobs)
          .set({
            status: "failed",
            completedAt: new Date(),
            errorMessage: `Unable to start Python scraper (${pythonExecutable}). Install scraper/requirements.txt or set PYTHON_PATH.`,
            details: error.message,
          })
          .where(eq(ingestionJobs.id, jobId));
      } catch (dbError) {
        console.error("Failed to update job spawn failure:", dbError);
      }
    });

    pyProcess.on("close", async (code) => {
      activeProcess = null;
      console.log(`[Job ${jobId}] Python scraper finished with code ${code}`);
      if (code !== 0) {
        try {
          await db
            .update(ingestionJobs)
            .set({
              status: "failed",
              completedAt: new Date(),
              errorMessage: `Scraper exited with code ${code}`,
              details: outputLog.slice(-2000),
            })
            .where(eq(ingestionJobs.id, jobId));
        } catch (e) {
          console.error("Failed to update job failure:", e);
        }
      }
    });

    return NextResponse.json(
      {
        jobId,
        status: "queued",
        message: "News ingestion job triggered successfully",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/ingest/trigger:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to trigger ingestion job",
        },
      },
      { status: 500 }
    );
  }
}
