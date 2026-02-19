"use client";

import { useQuery } from "@tanstack/react-query";
import type { StandardImpactResult } from "@/types";

export function useStandardImpact(assignmentId: number | null) {
  return useQuery<StandardImpactResult>({
    queryKey: ["standard-impact", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/standard-impact`);
      if (!res.ok) throw new Error("Failed to fetch standard-level impact");
      return res.json();
    },
    enabled: assignmentId != null,
    staleTime: 5 * 60 * 1000,
  });
}
