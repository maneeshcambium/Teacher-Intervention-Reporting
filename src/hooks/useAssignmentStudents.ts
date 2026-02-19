"use client";

import { useQuery } from "@tanstack/react-query";
import type { AssignmentStudentRow } from "@/types";

export function useAssignmentStudents(assignmentId: number | null, rosterId?: number | null) {
  return useQuery<AssignmentStudentRow[]>({
    queryKey: ["assignment-students", assignmentId, rosterId ?? "all"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rosterId) params.set("rosterId", String(rosterId));
      const qs = params.toString();
      const res = await fetch(`/api/assignments/${assignmentId}/students${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch assignment students");
      return res.json();
    },
    enabled: !!assignmentId,
  });
}
