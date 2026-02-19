"use client";

import { useQuery } from "@tanstack/react-query";
import type { StudentDetail, StudentAssignmentsResponse } from "@/types";

export function useStudent(studentId: number | null) {
  return useQuery<StudentDetail>({
    queryKey: ["student", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/students/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student");
      return res.json();
    },
    enabled: !!studentId,
  });
}

export function useStudentAssignments(studentId: number | null) {
  return useQuery<StudentAssignmentsResponse>({
    queryKey: ["student-assignments", studentId],
    queryFn: async () => {
      const res = await fetch(`/api/students/${studentId}/assignments`);
      if (!res.ok) throw new Error("Failed to fetch student assignments");
      return res.json();
    },
    enabled: !!studentId,
  });
}
