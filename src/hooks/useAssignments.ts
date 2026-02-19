"use client";

import { useQuery } from "@tanstack/react-query";
import type { AssignmentListItem } from "@/types";

export function useAssignments(groupId: number | null) {
  return useQuery<AssignmentListItem[]>({
    queryKey: ["assignments", groupId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments?groupId=${groupId}`);
      if (!res.ok) throw new Error("Failed to fetch assignments");
      return res.json();
    },
    enabled: !!groupId,
  });
}
