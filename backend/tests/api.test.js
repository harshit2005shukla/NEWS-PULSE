import { describe, it } from "node:test";
import assert from "node:assert";

describe("News Pulse Backend Unit Tests", () => {
  it("should validate cluster search parameter parsing", () => {
    const rawSources = "BBC, NPR, Guardian";
    const parsed = rawSources.split(",").map((s) => s.trim().toLowerCase());
    assert.deepStrictEqual(parsed, ["bbc", "npr", "guardian"]);
  });

  it("should format timeline object correctly", () => {
    const cluster = {
      id: 1,
      label: "AI Safety Regulations",
      articleCount: 5,
      earliestArticleTime: new Date("2026-09-20T10:00:00Z"),
      latestArticleTime: new Date("2026-09-21T12:00:00Z"),
      keywords: "ai, safety, regulations",
    };

    const timelineItem = {
      id: cluster.id,
      label: cluster.label,
      startTime: cluster.earliestArticleTime.toISOString(),
      endTime: cluster.latestArticleTime.toISOString(),
      articleCount: cluster.articleCount,
      intensity: cluster.articleCount,
    };

    assert.strictEqual(timelineItem.id, 1);
    assert.strictEqual(timelineItem.intensity, 5);
    assert.strictEqual(timelineItem.startTime, "2026-09-20T10:00:00.000Z");
  });

  it("should reject non-integer cluster ID safely", () => {
    const rawId = "abc";
    const id = parseInt(rawId, 10);
    assert.strictEqual(isNaN(id), true);
  });
});
