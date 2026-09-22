import { NextResponse } from "next/server";
import { db } from "@/db";
import { ingestionJobs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_JOB_ID",
            message: "jobId parameter is required",
          },
        },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.id, jobId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "JOB_NOT_FOUND",
            message: `Ingestion job with ID ${jobId} not found`,
          },
        },
        { status: 404 }
      );
    }

    const job = rows[0];

    let parsedDetails = null;
    if (job.details) {
      try {
        parsedDetails = JSON.parse(job.details);
      } catch {
        parsedDetails = job.details;
      }
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress ?? 0,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      articlesProcessed: job.articlesProcessed ?? 0,
      articlesCreated: job.articlesCreated ?? 0,
      clustersUpdated: job.clustersUpdated ?? 0,
      errorMessage: job.errorMessage,
      details: parsedDetails,
    });
  } catch (error: any) {
    console.error("Error in GET /api/ingest/status/[jobId]:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve job status",
        },
      },
      { status: 500 }
    );
  }
}
