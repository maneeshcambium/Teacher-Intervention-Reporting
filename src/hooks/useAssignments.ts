"use client";

import { useQuery } from "@tanstack/react-query";
import type { AssignmentListItem } from "@/types";

export function useAssignments(groupId: number | null, rosterId?: number | null) {
  return useQuery<AssignmentListItem[]>({
    queryKey: ["assignments", groupId, rosterId ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ groupId: String(groupId) });
      if (rosterId) params.set("rosterId", String(rosterId));
      const res = await fetch(`/api/assignments?${params}`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    enabled: !!groupId,
  });
}
