"use client";

import { useQuery } from "@tanstack/react-query";
import type { ImpactResult, ImpactSummaryResponse } from "@/types";

export function useImpactSummary(groupId: number | null) {
  return useQuery<ImpactSummaryResponse>({
    queryKey: ["impact-summary", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/impact/summary?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed to fetch impact summary");
      return res.json();
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000, // 5 minutes — expensive calculation
  });
}

export function useAssignmentImpact(assignmentId: number | null) {
  return useQuery<ImpactResult>({
    queryKey: ["assignment-impact", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/impact`);
      if (!res.ok) throw new Error("Failed to fetch assignment impact");
      return res.json();
    },
    enabled: !!assignmentId,
    staleTime: 5 * 60 * 1000,
  });
}
