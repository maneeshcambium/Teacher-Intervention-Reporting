import { useQuery } from "@tanstack/react-query";
import type { StandardsBreakdownResponse } from "@/types";

export function useStandardsBreakdown(
  rosterId: number | null,
  testId: number | null
) {
  return useQuery<StandardsBreakdownResponse>({
    queryKey: ["standards-breakdown", rosterId, testId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/standards-breakdown?testId=${testId}`
      );
      if (!res.ok) throw new Error("Failed to fetch standards breakdown");
      return res.json();
    },
    enabled: !!rosterId && !!testId,
  });
}
