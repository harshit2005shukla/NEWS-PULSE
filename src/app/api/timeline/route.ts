import { NextResponse } from "next/server";
import { db } from "@/db";
import { clusters, articles } from "@/db/schema";
import { inArray, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sourcesParam = searchParams.get("sources");
    const activeSources = sourcesParam ? sourcesParam.split(",").map(s => s.trim()).filter(Boolean) : null;
    const search = searchParams.get("search")?.toLowerCase().trim();

    // Pull clusters
    const allClusters = await db
      .select({
        id: clusters.id,
        label: clusters.label,
        articleCount: clusters.articleCount,
        startTime: clusters.earliestArticleTime,
        endTime: clusters.latestArticleTime,
        keywords: clusters.keywords,
      })
      .from(clusters)
      .orderBy(desc(clusters.articleCount), desc(clusters.latestArticleTime));

    // Get sources per cluster for fine-grained frontend filtering & inspection
    const articlesWithSource = await db
      .select({
        clusterId: articles.clusterId,
        source: articles.source,
      })
      .from(articles);

    const clusterSourceMap = new Map<number, Set<string>>();
    for (const a of articlesWithSource) {
      if (a.clusterId) {
        if (!clusterSourceMap.has(a.clusterId)) {
          clusterSourceMap.set(a.clusterId, new Set());
        }
        clusterSourceMap.get(a.clusterId)!.add(a.source);
      }
    }

    let timelineData = allClusters.map((c) => {
      const clusterSources = Array.from(clusterSourceMap.get(c.id) || []);
      return {
        id: c.id,
        label: c.label,
        startTime: c.startTime ? c.startTime.toISOString() : new Date().toISOString(),
        endTime: c.endTime ? c.endTime.toISOString() : new Date().toISOString(),
        articleCount: c.articleCount,
        intensity: c.articleCount,
        keywords: c.keywords,
        sources: clusterSources,
      };
    });

    if (activeSources && activeSources.length > 0) {
      timelineData = timelineData.filter((item) =>
        item.sources.some((s) => activeSources.includes(s))
      );
    }

    if (search) {
      timelineData = timelineData.filter(
        (item) =>
          item.label.toLowerCase().includes(search) ||
          (item.keywords && item.keywords.toLowerCase().includes(search))
      );
    }

    return NextResponse.json(timelineData);
  } catch (error: any) {
    console.error("Error in GET /api/timeline:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to generate timeline data",
        },
      },
      { status: 500 }
    );
  }
}
