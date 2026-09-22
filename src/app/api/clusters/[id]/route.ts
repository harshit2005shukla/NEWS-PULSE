import { NextResponse } from "next/server";
import { db } from "@/db";
import { clusters, articles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clusterId = parseInt(id, 10);

    if (isNaN(clusterId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CLUSTER_ID",
            message: "Cluster ID must be a valid integer",
          },
        },
        { status: 400 }
      );
    }

    const clusterRows = await db
      .select()
      .from(clusters)
      .where(eq(clusters.id, clusterId))
      .limit(1);

    if (clusterRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CLUSTER_NOT_FOUND",
            message: `Cluster with ID ${clusterId} was not found`,
          },
        },
        { status: 404 }
      );
    }

    const cluster = clusterRows[0];

    // Get all articles for this cluster chronologically
    const clusterArticles = await db
      .select({
        id: articles.id,
        source: articles.source,
        title: articles.title,
        summary: articles.summary,
        content: articles.content,
        url: articles.url,
        author: articles.author,
        publishedAt: articles.publishedAt,
        extractionStatus: articles.extractionStatus,
      })
      .from(articles)
      .where(eq(articles.clusterId, clusterId))
      .orderBy(desc(articles.publishedAt));

    return NextResponse.json({
      id: cluster.id,
      label: cluster.label,
      articleCount: cluster.articleCount,
      keywords: cluster.keywords,
      earliestArticleTime: cluster.earliestArticleTime,
      latestArticleTime: cluster.latestArticleTime,
      createdAt: cluster.createdAt,
      updatedAt: cluster.updatedAt,
      articles: clusterArticles,
    });
  } catch (error: any) {
    console.error("Error in GET /api/clusters/[id]:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve cluster details",
        },
      },
      { status: 500 }
    );
  }
}
