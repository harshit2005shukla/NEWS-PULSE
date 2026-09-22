export const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(d) + " UTC";
  } catch {
    return dateStr;
  }
};

export const formatDateOnly = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return "";
  }
};

export const getSourceBadgeColor = (source: string) => {
  const s = source.toLowerCase();
  if (s.includes("bbc")) return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  if (s.includes("npr")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  if (s.includes("guardian")) return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
  if (s.includes("al jazeera") || s.includes("aljazeera")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
};
