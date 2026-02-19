"use client";

import { useQuery } from "@tanstack/react-query";
import type { PerformanceLevel } from "@/types";

export function usePerformanceLevels() {
  return useQuery<PerformanceLevel[]>({
    queryKey: ["performanceLevels"],
    queryFn: async () => {
      const res = await fetch("/api/performance-levels");
      if (!res.ok) throw new Error("Failed to fetch performance levels");
      return res.json();
    },
    staleTime: Infinity, // Performance levels don't change
  });
}
