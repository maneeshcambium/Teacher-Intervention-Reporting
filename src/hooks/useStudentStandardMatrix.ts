import { useQuery } from "@tanstack/react-query";
import type { StudentStandardMatrixResponse } from "@/types";

export function useStudentStandardMatrix(
  rosterId: number | null,
  testId: number | null
) {
  return useQuery<StudentStandardMatrixResponse>({
    queryKey: ["student-standard-matrix", rosterId, testId],
    queryFn: async () => {
      const res = await fetch(
        `/api/rosters/${rosterId}/student-standard-matrix?testId=${testId}`
      );
      if (!res.ok) throw new Error("Failed to fetch student-standard matrix");
      return res.json();
    },
    enabled: !!rosterId && !!testId,
  });
}
