"use client";

import { useQuery } from "@tanstack/react-query";
import type { PerformanceResponse } from "@/types";

export function usePerformance(rosterId: number | null, testId: number | null) {
  return useQuery<PerformanceResponse>({
    queryKey: ["performance", rosterId, testId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/performance?testId=${testId}`
      );
      if (!res.ok) throw new Error("Failed to fetch performance data");
      return res.json();
    },
    enabled: !!rosterId && !!testId,
  });
}
