"use client";

import { useQuery } from "@tanstack/react-query";
import type { StudentsResponse, StudentFilters } from "@/types";

export function useStudents(
  rosterId: number | null,
  testId: number | null,
  filters: StudentFilters = {}
) {
  const { level, rc, search, sort = "name", order = "asc" } = filters;

  return useQuery<StudentsResponse>({
    queryKey: ["students", rosterId, testId, level, rc, search, sort, order],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("testId", String(testId));
      if (level != null) params.set("level", String(level));
      if (rc != null) params.set("rc", String(rc));
      if (search) params.set("search", search);
      if (sort) params.set("sort", sort);
      if (order) params.set("order", order);

      const res = await fetch(
        `/api/rosters/${rosterId}/students?${params.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch students");
      return res.json();
    },
    enabled: !!rosterId && !!testId,
  });
}
