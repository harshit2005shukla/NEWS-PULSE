"use client";

import React from "react";
import { Filter, Search, X } from "lucide-react";

interface SourceFiltersProps {
  availableSources: string[];
  selectedSources: string[];
  onToggleSource: (source: string) => void;
  onSelectAll: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const SourceFilters: React.FC<SourceFiltersProps> = ({
  availableSources,
  selectedSources,
  onToggleSource,
  onSelectAll,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Source Badges/Toggles */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-2">
            <Filter className="w-3.5 h-3.5" />
            <span>SOURCES:</span>
          </div>

          <button
            onClick={onSelectAll}
            className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
              selectedSources.length === availableSources.length
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
            }`}
          >
            All Sources
          </button>

          {availableSources.map((source) => {
            const isSelected = selectedSources.includes(source);
            return (
              <button
                key={source}
                onClick={() => onToggleSource(source)}
                className={`text-xs px-3 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border-blue-500/40 shadow-xs"
                    : "bg-background text-muted-foreground border-border hover:border-muted-foreground/40 opacity-70"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? "bg-blue-600 dark:bg-blue-400" : "bg-muted-foreground"
                  }`}
                />
                {source}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search topics or keywords..."
            className="w-full text-xs sm:text-sm pl-9 pr-8 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
