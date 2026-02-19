"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReportingCategoryWithStandards } from "@/types";

export function useReportingCategories() {
  return useQuery<ReportingCategoryWithStandards[]>({
    queryKey: ["reporting-categories"],
    queryFn: async () => {
      const res = await fetch("/api/reporting-categories");
      if (!res.ok) throw new Error("Failed to fetch reporting categories");
      return res.json();
    },
    staleTime: Infinity,
  });
}
