import { NextResponse } from "next/server";
import { db } from "@/db";
import { clusters, articles } from "@/db/schema";
import { sql, inArray } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourcesParam = searchParams.get("sources");
    const activeSources = sourcesParam ? sourcesParam.split(",").map(s => s.trim()).filter(Boolean) : null;
    const search = searchParams.get("search")?.toLowerCase().trim();

    let query = db
      .select({
        id: clusters.id,
        label: clusters.label,
        articleCount: clusters.articleCount,
        startTime: clusters.earliestArticleTime,
        endTime: clusters.latestArticleTime,
        keywords: clusters.keywords,
      })
      .from(clusters)
      .orderBy(sql`${clusters.articleCount} DESC`, sql`${clusters.latestArticleTime} DESC`);

    const clusterList = await query;

    // Filter if activeSources or search specified
    if (activeSources && activeSources.length > 0) {
      // Find clusters that have articles in activeSources
      const matchingClusterIds = await db
        .selectDistinct({ clusterId: articles.clusterId })
        .from(articles)
        .where(inArray(articles.source, activeSources));
      
      const allowedIds = new Set(matchingClusterIds.map(m => m.clusterId).filter(Boolean));
      let filtered = clusterList.filter(c => allowedIds.has(c.id));
      if (search) {
        filtered = filtered.filter(c => 
          c.label.toLowerCase().includes(search) || 
          (c.keywords && c.keywords.toLowerCase().includes(search))
        );
      }
      return NextResponse.json(filtered);
    }

    let result = clusterList;
    if (search) {
      result = result.filter(c => 
        c.label.toLowerCase().includes(search) || 
        (c.keywords && c.keywords.toLowerCase().includes(search))
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in GET /api/clusters:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve clusters",
        },
      },
      { status: 500 }
    );
  }
}
