"use client";

import { useQuery } from "@tanstack/react-query";
import type { RCBreakdownResponse } from "@/types";

export function useRCBreakdown(rosterId: number | null, testId: number | null) {
  return useQuery<RCBreakdownResponse>({
    queryKey: ["rcBreakdown", rosterId, testId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/rc-breakdown?testId=${testId}`
      );
      if (!res.ok) throw new Error("Failed to fetch RC breakdown");
      return res.json();
    },
    enabled: !!rosterId && !!testId,
  });
}
