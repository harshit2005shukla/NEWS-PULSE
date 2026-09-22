"use client";

import React, { useState } from "react";
import { ClusterDetail } from "@/types/news";
import { formatDateTime, getSourceBadgeColor } from "@/lib/formatters";
import {
  X,
  ExternalLink,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  FileText,
  User,
  Sparkles,
} from "lucide-react";

interface ClusterDetailDrawerProps {
  cluster: ClusterDetail | null;
  isLoading: boolean;
  onClose: () => void;
}

export const ClusterDetailDrawer: React.FC<ClusterDetailDrawerProps> = ({
  cluster,
  isLoading,
  onClose,
}) => {
  const [expandedArticles, setExpandedArticles] = useState<Record<number, boolean>>({});

  const toggleExpand = (id: number) => {
    setExpandedArticles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!cluster && !isLoading) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] lg:w-[580px] bg-background border-l border-border shadow-2xl z-50 flex flex-col transition-all duration-300 animate-slideIn">
      {/* Drawer Header */}
      <div className="p-4 sm:p-5 border-b border-border bg-card/60 backdrop-blur-md flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {cluster ? `${cluster.articleCount} Articles in Cluster` : "Loading..."}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground mt-1 truncate">
            {cluster?.label || "Topic Details"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          aria-label="Close cluster details"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
            <Sparkles className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Loading cluster intelligence...</p>
          </div>
        ) : cluster ? (
          <>
            {/* Cluster Meta Box */}
            <div className="bg-muted/30 border border-border rounded-xl p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Time Horizon:
                </span>
                <span className="font-medium text-foreground">
                  {formatDateTime(cluster.earliestArticleTime)} – {formatDateTime(cluster.latestArticleTime)}
                </span>
              </div>
              {cluster.keywords && (
                <div className="flex items-start gap-1.5 text-muted-foreground pt-1 border-t border-border/50">
                  <span className="shrink-0 font-medium">Keywords:</span>
                  <span className="text-foreground italic">{cluster.keywords}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Clustered Articles ({cluster.articles.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">Chronological order</span>
            </div>

            {/* Articles List */}
            <div className="space-y-3">
              {cluster.articles.map((article) => {
                const isExpanded = !!expandedArticles[article.id];
                return (
                  <div
                    key={article.id}
                    className="bg-card border border-border rounded-xl p-4 shadow-xs transition-all hover:border-border/80"
                  >
                    {/* Source & Date Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${getSourceBadgeColor(
                          article.source
                        )}`}
                      >
                        {article.source}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDateTime(article.publishedAt)}
                      </span>
                    </div>

                    {/* Headline */}
                    <h4 className="text-sm font-semibold text-foreground mb-2 leading-snug">
                      {article.title}
                    </h4>

                    {/* Author if available */}
                    {article.author && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2">
                        <User className="w-3 h-3" />
                        <span>By {article.author}</span>
                      </div>
                    )}

                    {/* Summary */}
                    {article.summary && (
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3 leading-relaxed">
                        {article.summary}
                      </p>
                    )}

                    {/* Full Extracted Body (Collapsible) */}
                    {article.content && (
                      <div className="mt-2 pt-2 border-t border-border/60">
                        <button
                          onClick={() => toggleExpand(article.id)}
                          className="flex items-center justify-between w-full text-xs text-blue-600 dark:text-blue-400 font-medium py-1 hover:underline"
                        >
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {isExpanded ? "Hide Full Scraped Article" : "View Full Scraped Article"}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="mt-2 p-3 bg-muted/40 rounded-lg text-xs text-foreground/90 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-line border border-border/40">
                            {article.content}
                          </div>
                        )}
                      </div>
                    )}

                    {/* External Link */}
                    <div className="mt-3 pt-2 border-t border-border/40 flex justify-end">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:text-primary/80 font-semibold inline-flex items-center gap-1.5 group"
                      >
                        <span>Read Original on {article.source}</span>
                        <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
