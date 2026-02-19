import { useQuery } from "@tanstack/react-query";
import type { StandardStudentsResponse } from "@/types";

export function useStandardStudents(
  rosterId: number | null,
  testId: number | null,
  standardId: number | null
) {
  return useQuery<StandardStudentsResponse>({
    queryKey: ["standard-students", rosterId, testId, standardId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/standard-students?testId=${testId}&standardId=${standardId}`
      );
      if (!res.ok) throw new Error("Failed to fetch standard students");
      return res.json();
    },
    enabled: !!rosterId && !!testId && !!standardId,
  });
}
