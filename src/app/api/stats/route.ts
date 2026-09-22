import { NextResponse } from "next/server";
import { db } from "@/db";
import { articles, clusters, ingestionJobs } from "@/db/schema";
import { sql, desc } from "drizzle-orm";

export async function GET() {
  try {
    const [articleCountRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(articles);

    const [clusterCountRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(clusters);

    const sourceRows = await db
      .selectDistinct({ source: articles.source })
      .from(articles);

    const latestArticles = await db
      .select({ maxDate: sql<Date>`max(${articles.publishedAt})` })
      .from(articles);

    const lastJob = await db
      .select()
      .from(ingestionJobs)
      .orderBy(desc(ingestionJobs.startedAt))
      .limit(1);

    return NextResponse.json({
      totalArticles: Number(articleCountRes?.count || 0),
      totalClusters: Number(clusterCountRes?.count || 0),
      sources: sourceRows.map(r => r.source).filter(Boolean),
      lastUpdated: latestArticles[0]?.maxDate || null,
      lastJob: lastJob[0] || null,
    });
  } catch (error: any) {
    console.error("Error in GET /api/stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve statistics",
        },
      },
      { status: 500 }
    );
  }
}
