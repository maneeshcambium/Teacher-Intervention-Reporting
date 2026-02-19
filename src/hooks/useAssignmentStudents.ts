"use client";

import { useQuery } from "@tanstack/react-query";
import type { AssignmentStudentRow } from "@/types";

export function useAssignmentStudents(assignmentId: number | null) {
  return useQuery<AssignmentStudentRow[]>({
    queryKey: ["assignment-students", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/students`);
      if (!res.ok) throw new Error("Failed to fetch assignment students");
      return res.json();
    },
    enabled: !!assignmentId,
  });
}
